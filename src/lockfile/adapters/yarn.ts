import type { EcosystemAdapter } from '../adapter';

/** Yarn v1 vs Berry differ too much for one CLI path; CVE extraction not implemented yet. */
export const yarnAdapter: EcosystemAdapter = {
  pmName: 'yarn',
  osvEcosystem: 'npm',
  supported: false,

  async listDeps(): Promise<never[]> {
    return [];
  },
};
