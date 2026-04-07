import { describe, expect, it } from 'vitest';
import { healthIngestRequestSchema } from '../../schemas/ingest-body';

const emptyUnusedCode = {
  unusedDepsList: [] as string[],
  unusedFilesList: [] as string[],
  unusedTypeExportsList: [] as string[],
};

describe('healthIngestRequestSchema', () => {
  it('accepts unusedCode only (Knip)', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: { unusedCode: emptyUnusedCode },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(true);
  });

  it('accepts cve only', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: {
        cve: {
          lockfileType: 'pnpm',
          prod: { totalVulnerabilities: 0, packages: [] },
          dev: { totalVulnerabilities: 0, packages: [] },
        },
      },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(true);
  });

  it('accepts unusedCode and cve together', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: {
        unusedCode: emptyUnusedCode,
        cve: {
          lockfileType: 'npm',
          prod: { totalVulnerabilities: 0, packages: [] },
          dev: { totalVulnerabilities: 0, packages: [] },
        },
      },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(true);
  });

  it('rejects invalid unusedFilesList (non-array)', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: {
        unusedCode: {
          unusedDepsList: [],
          unusedFilesList: 'not-an-array' as unknown as string[],
          unusedTypeExportsList: [],
        },
      },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(false);
  });

  it('rejects invalid timestamp', () => {
    const raw = {
      timestamp: 'not-a-date',
      signals: { unusedCode: emptyUnusedCode },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(false);
  });

  it('accepts cve with partial severity buckets and vulnerability metadata', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: {
        cve: {
          lockfileType: 'pnpm',
          prod: {
            totalVulnerabilities: 1,
            severity: { critical: 1 },
            packages: [
              {
                name: 'pkg',
                version: '1.0.0',
                vulnerabilities: [{ id: 'GHSA-abc', severity: 'critical', description: 'test' }],
              },
            ],
          },
          dev: { totalVulnerabilities: 0, packages: [] },
        },
      },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(true);
  });

  it('rejects missing both unusedCode and cve', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: {},
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(false);
  });

  it('rejects signals with empty unusedCode object when cve absent', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: { unusedCode: {} },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(false);
  });
});
