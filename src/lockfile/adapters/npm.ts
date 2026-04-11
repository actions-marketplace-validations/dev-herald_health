import { readFileSync } from 'fs';
import type { EcosystemAdapter } from '../adapter';
import { parseNpmLockfile } from '../parse-npm';

export const npmAdapter: EcosystemAdapter = {
  pmName: 'npm',
  osvEcosystem: 'npm',
  supported: true,

  async listDeps(_lockfileDir: string, lockfilePath: string) {
    const content = readFileSync(lockfilePath, 'utf8');
    return parseNpmLockfile(content);
  },
};
