import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Dependency } from '../types';
import type { EcosystemAdapter } from '../adapter';
import { dedupeDependencies } from '../parse-npm';

const execFileAsync = promisify(execFile);

interface PnpmListDep {
  from?: string;
  version: string;
  resolved?: string;
  path?: string;
  dependencies?: Record<string, PnpmListDep>;
}

interface PnpmListWorkspace {
  name?: string;
  version?: string;
  path?: string;
  private?: boolean;
  dependencies?: Record<string, PnpmListDep>;
  devDependencies?: Record<string, PnpmListDep>;
}

function collectDepKeys(
  deps: Record<string, PnpmListDep> | undefined,
  into: Set<string>,
  pkgMap: Map<string, { name: string; version: string }>,
  visited: Set<string>
): void {
  if (!deps) return;
  for (const [name, dep] of Object.entries(deps)) {
    if (!dep?.version) continue;
    const key = `${name}@${dep.version}`;
    if (visited.has(key)) continue;
    visited.add(key);
    into.add(key);
    pkgMap.set(key, { name, version: dep.version });
    collectDepKeys(dep.dependencies, into, pkgMap, visited);
  }
}

/**
 * Converts the array emitted by `pnpm list --json --depth Infinity --lockfile-only`
 * into a flat `Dependency[]`.  Exported for unit testing without running pnpm.
 *
 * Prod wins: if a package is reachable from both a `dependencies` subtree and a
 * `devDependencies` subtree (across all workspaces), it is classified as prod.
 */
export function flattenPnpmListOutput(workspaces: PnpmListWorkspace[]): Dependency[] {
  const prodKeys = new Set<string>();
  const devKeys = new Set<string>();
  const pkgMap = new Map<string, { name: string; version: string }>();

  for (const ws of workspaces) {
    collectDepKeys(ws.dependencies, prodKeys, pkgMap, new Set());
    collectDepKeys(ws.devDependencies, devKeys, pkgMap, new Set());
  }

  const out: Dependency[] = [];
  for (const [key, pkg] of pkgMap) {
    const isDev = devKeys.has(key) && !prodKeys.has(key);
    out.push({ name: pkg.name, version: pkg.version, isDev });
  }

  return dedupeDependencies(out);
}

export const pnpmAdapter: EcosystemAdapter = {
  pmName: 'pnpm',
  osvEcosystem: 'npm',
  supported: true,

  async listDeps(lockfileDir: string, _lockfilePath: string): Promise<Dependency[]> {
    // Single run: JSON already splits prod vs dev per workspace (`dependencies` vs
    // `devDependencies`). No second `pnpm list --prod` pass — we classify from that tree.
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(
        'pnpm',
        ['list', '--json', '--depth', 'Infinity', '--lockfile-only'],
        { cwd: lockfileDir, maxBuffer: 50 * 1024 * 1024 }
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`pnpm list failed: ${msg}`);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(stdout);
    } catch {
      throw new Error('pnpm list: failed to parse JSON output');
    }

    if (!Array.isArray(raw)) {
      throw new Error('pnpm list: expected JSON array output');
    }

    return flattenPnpmListOutput(raw as PnpmListWorkspace[]);
  },
};
