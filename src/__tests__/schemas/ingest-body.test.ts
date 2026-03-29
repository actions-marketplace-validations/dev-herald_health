import { describe, expect, it } from 'vitest';
import { healthIngestRequestSchema } from '../../schemas/ingest-body';

describe('healthIngestRequestSchema', () => {
  it('accepts minimal valid body', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: { knip: { unusedFiles: 0, unusedDependencies: 0 } },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(true);
  });

  it('rejects negative unusedFiles', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: { knip: { unusedFiles: -1, unusedDependencies: 0 } },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(false);
  });

  it('rejects invalid timestamp', () => {
    const raw = {
      timestamp: 'not-a-date',
      signals: { knip: { unusedFiles: 0, unusedDependencies: 0 } },
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(false);
  });

  it('rejects missing knip', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      signals: {},
    };
    expect(healthIngestRequestSchema.safeParse(raw).success).toBe(false);
  });
});
