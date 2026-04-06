export type LockfileType = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface Dependency {
  name: string;
  version: string;
  isDev: boolean;
}

export interface DetectedLockfile {
  type: LockfileType;
  path: string;
}
