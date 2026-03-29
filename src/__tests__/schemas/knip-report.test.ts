import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { knipReportSchema } from '../../schemas/knip-report';

describe('knipReportSchema', () => {
  it('accepts monorepo-style fixture', () => {
    const raw = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/knip-monorepo-sample.json'), 'utf8')
    ) as unknown;
    const r = knipReportSchema.safeParse(raw);
    expect(r.success).toBe(true);
  });

  it('accepts optional top-level files', () => {
    const raw = {
      files: ['a.ts', 'b.ts'],
      issues: [{ file: 'x.ts' }],
    };
    expect(knipReportSchema.safeParse(raw).success).toBe(true);
  });

  it('rejects missing issues', () => {
    const raw = { files: [] };
    expect(knipReportSchema.safeParse(raw).success).toBe(false);
  });

  it('rejects non-array issues', () => {
    const raw = { issues: {} };
    expect(knipReportSchema.safeParse(raw).success).toBe(false);
  });

  it('preserves unknown knip fields via passthrough', () => {
    const raw = {
      issues: [
        {
          file: 'apps/web/package.json',
          catalog: [],
          dependencies: [],
          devDependencies: [],
        },
      ],
    };
    const r = knipReportSchema.safeParse(raw);
    expect(r.success).toBe(true);
    if (r.success) {
      const first = r.data.issues[0] as { catalog?: unknown };
      expect(first.catalog).toEqual([]);
    }
  });
});
