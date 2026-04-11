import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import type { DetectedEcosystem, EcosystemAdapter } from './adapter';
import { bunAdapter } from './adapters/bun';
import { npmAdapter } from './adapters/npm';
import { pnpmAdapter } from './adapters/pnpm';
import { yarnAdapter } from './adapters/yarn';

const PRIORITY: Array<{ file: string; adapter: EcosystemAdapter }> = [
  { file: 'pnpm-lock.yaml', adapter: pnpmAdapter },
  { file: 'yarn.lock', adapter: yarnAdapter },
  { file: 'package-lock.json', adapter: npmAdapter },
  { file: 'bun.lock', adapter: bunAdapter },
];

const ADAPTER_BY_FILENAME = new Map(PRIORITY.map((p) => [p.file.toLowerCase(), p.adapter] as const));

export function inferPmNameFromFilename(filename: string): string | undefined {
  const base = filename.split(/[/\\]/).pop()?.toLowerCase() ?? '';
  return ADAPTER_BY_FILENAME.get(base)?.pmName;
}

/** @deprecated Use {@link inferPmNameFromFilename} */
export function inferLockfileTypeFromFilename(filename: string): string | undefined {
  return inferPmNameFromFilename(filename);
}

export function detectAdapter(workspaceRoot: string, overridePath?: string): DetectedEcosystem {
  if (overridePath !== undefined && overridePath.trim().length > 0) {
    const full = resolve(overridePath.trim());
    if (!existsSync(full)) {
      throw new Error(`lockfile-path not found: ${full}`);
    }
    const base = full.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    const adapter = ADAPTER_BY_FILENAME.get(base);
    if (!adapter) {
      throw new Error(
        `Could not infer lockfile type from filename; use pnpm-lock.yaml, yarn.lock, package-lock.json, or bun.lock`
      );
    }
    return { adapter, lockfileDir: dirname(full), lockfilePath: full };
  }

  for (const { file, adapter } of PRIORITY) {
    const full = join(workspaceRoot, file);
    if (existsSync(full)) {
      return { adapter, lockfileDir: dirname(full), lockfilePath: full };
    }
  }

  throw new Error(
    `No lockfile found in ${workspaceRoot}. Expected one of: ${PRIORITY.map((p) => p.file).join(', ')}`
  );
}
