import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { knipReportSchema } from '../schemas/knip-report';
import { mapKnipReportToSignals } from '../signals/knip';

describe('mapKnipReportToSignals', () => {
  it('counts distinct unused files and sums deps from fixture', () => {
    const raw = JSON.parse(
      readFileSync(join(__dirname, 'fixtures/knip-monorepo-sample.json'), 'utf8')
    ) as unknown;
    const report = knipReportSchema.parse(raw);
    const agg = mapKnipReportToSignals(report);
    expect(agg.unusedFiles).toBe(2);
    expect(agg.unusedDependencies).toBe(3);
  });

  it('includes top-level files in distinct file count', () => {
    const report = knipReportSchema.parse({
      files: ['root-a.ts'],
      issues: [
        {
          file: 'apps/x.ts',
          files: [{ name: 'apps/x.ts' }],
        },
      ],
    });
    const agg = mapKnipReportToSignals(report);
    expect(agg.unusedFiles).toBe(2);
  });

  it('matches Knip reporter shape: unlisted/unresolved do not affect dependency totals', () => {
    const report = knipReportSchema.parse({
      issues: [
        {
          file: 'apps/web/postcss.config.mjs',
          binaries: [],
          catalog: [],
          dependencies: [],
          devDependencies: [],
          duplicates: [],
          enumMembers: [],
          exports: [],
          files: [],
          namespaceMembers: [],
          optionalPeerDependencies: [],
          types: [],
          unlisted: [{ name: 'postcss' }],
          unresolved: [],
        },
        {
          file: 'tools/typescript/nextjs.json',
          binaries: [],
          catalog: [],
          dependencies: [],
          devDependencies: [],
          duplicates: [],
          enumMembers: [],
          exports: [],
          files: [],
          namespaceMembers: [],
          optionalPeerDependencies: [],
          types: [],
          unlisted: [],
          unresolved: [{ name: 'next' }],
        },
      ],
    });
    const agg = mapKnipReportToSignals(report);
    expect(agg.unusedFiles).toBe(0);
    expect(agg.unusedDependencies).toBe(0);
  });
});
