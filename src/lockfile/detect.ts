import { existsSync } from 'fs';
import { join, resolve } from 'path';
import type { DetectedLockfile, LockfileType } from './types';

const PRIORITY: Array<{ file: string; type: LockfileType }> = [
  { file: 'pnpm-lock.yaml', type: 'pnpm' },
  { file: 'yarn.lock', type: 'yarn' },
  { file: 'package-lock.json', type: 'npm' },
  { file: 'bun.lock', type: 'bun' },
];

export function inferLockfileTypeFromFilename(filename: string): LockfileType | undefined {
  const base = filename.split(/[/\\]/).pop()?.toLowerCase() ?? '';
  if (base === 'pnpm-lock.yaml') return 'pnpm';
  if (base === 'yarn.lock') return 'yarn';
  if (base === 'package-lock.json') return 'npm';
  if (base === 'bun.lock') return 'bun';
  return undefined;
}

export function detectLockfile(workspaceRoot: string, overridePath?: string): DetectedLockfile {
  if (overridePath !== undefined && overridePath.trim().length > 0) {
    const full = resolve(overridePath.trim());
    if (!existsSync(full)) {
      throw new Error(`lockfile-path not found: ${full}`);
    }
    const inferred = inferLockfileTypeFromFilename(full);
    if (!inferred) {
      throw new Error(
        `Could not infer lockfile type from filename; use pnpm-lock.yaml, yarn.lock, package-lock.json, or bun.lock`
      );
    }
    return { type: inferred, path: full };
  }

  for (const { file, type } of PRIORITY) {
    const full = join(workspaceRoot, file);
    if (existsSync(full)) {
      return { type, path: full };
    }
  }

  throw new Error(
    `No lockfile found in ${workspaceRoot}. Expected one of: ${PRIORITY.map((p) => p.file).join(', ')}`
  );
}
