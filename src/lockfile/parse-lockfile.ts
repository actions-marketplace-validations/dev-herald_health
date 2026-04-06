import { readFileSync } from 'fs';
import type { Dependency } from './types';
import type { LockfileType } from './types';
import { parseNpmLockfile } from './parse-npm';
import { parsePnpmLockfile } from './parse-pnpm';

/**
 * Yarn and Bun lockfiles may still be chosen by {@link detectLockfile} ordering;
 * CVE dependency extraction supports npm and pnpm only. Callers should warn when
 * type is `yarn` or `bun` and skip OSV aggregation.
 */
export function parseLockfile(type: LockfileType, lockfilePath: string): Dependency[] {
  const content = readFileSync(lockfilePath, 'utf8');

  switch (type) {
    case 'npm':
      return parseNpmLockfile(content);
    case 'pnpm':
      return parsePnpmLockfile(content);
    case 'yarn':
    case 'bun':
      return [];
    default: {
      const _x: never = type;
      throw new Error(`Unknown lockfile type: ${_x}`);
    }
  }
}
