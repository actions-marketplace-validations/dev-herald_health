import type { EcosystemAdapter } from '../adapter';

/** Bun lockfile / CLI path not wired yet; parity with previous yarn skip. */
export const bunAdapter: EcosystemAdapter = {
  pmName: 'bun',
  osvEcosystem: 'npm',
  supported: false,

  async listDeps(): Promise<never[]> {
    return [];
  },
};
