import { describe, expect, it } from 'vitest';
import { buildHealthIngestPayload } from '../build-payload';

const emptyUnused = {
  unusedDepsList: [],
  unusedFilesList: [],
  unusedTypeExportsList: [],
};

describe('buildHealthIngestPayload', () => {
  it('requires at least one signal', () => {
    expect(() => buildHealthIngestPayload({})).toThrow(/At least one/);
  });

  it('builds unusedCode-only', () => {
    const p = buildHealthIngestPayload({ unusedCode: emptyUnused });
    expect(p.signals.unusedCode).toEqual(emptyUnused);
    expect(p.signals.cve).toBeUndefined();
  });

  it('builds cve-only', () => {
    const p = buildHealthIngestPayload({
      cve: {
        lockfileType: 'pnpm',
        prod: { vulnerablePackages: 0, totalVulnerabilities: 0 },
        dev: { vulnerablePackages: 1, totalVulnerabilities: 2 },
      },
    });
    expect(p.signals.cve?.dev.totalVulnerabilities).toBe(2);
    expect(p.signals.unusedCode).toBeUndefined();
  });
});
