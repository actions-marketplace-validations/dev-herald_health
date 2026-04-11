import type { Dependency } from './types';

export interface EcosystemAdapter {
  readonly pmName: string;
  readonly osvEcosystem: string;
  /** False for lockfile types we detect but don't yet support for CVE scanning. */
  readonly supported: boolean;
  listDeps(lockfileDir: string, lockfilePath: string): Promise<Dependency[]>;
}

export interface DetectedEcosystem {
  adapter: EcosystemAdapter;
  /** Directory that contains the lockfile — passed as cwd to CLI adapters. */
  lockfileDir: string;
  lockfilePath: string;
}
