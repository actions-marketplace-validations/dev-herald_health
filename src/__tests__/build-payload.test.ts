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
        prod: { totalVulnerabilities: 0, packages: [] },
        dev: {
          totalVulnerabilities: 2,
          packages: [
            {
              name: 'x',
              version: '1.0.0',
              vulnerabilities: [{ id: 'A' }, { id: 'B' }],
            },
          ],
        },
      },
    });
    expect(p.signals.cve?.dev.totalVulnerabilities).toBe(2);
    expect(p.signals.cve?.dev.packages).toHaveLength(1);
    expect(p.signals.unusedCode).toBeUndefined();
  });
});
