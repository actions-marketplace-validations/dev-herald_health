import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildHealthIngestPayload } from '../../build-payload';
import { bundleSignalSchema, healthIngestRequestSchema } from '../../schemas/ingest-body';
import { parseNextjsBundleInput } from '../../signals/bundle';

/** Turbopack: `next experimental-analyze --output` → `.next/diagnostics/analyze`. */
export const BUNDLE_EXPERIMENTAL_ANALYZE_FIXTURES = [
  { name: 'nextjs', analyzeDir: 'apps/nextjs/.next/diagnostics/analyze' },
] as const;

/** Webpack: `ANALYZE=true next build --webpack` with `@next/bundle-analyzer` → `.next/analyze/*.html`. */
export const WEBPACK_BUNDLE_ANALYZER_FIXTURES = [
  { name: 'nextjs-webpack', analyzeDir: 'apps/nextjs-webpack/.next/analyze' },
] as const;

function repoRoot(): string {
  return path.join(__dirname, '../../..');
}

function resolveDir(rel: string): string {
  return path.join(repoRoot(), rel);
}

function isFiniteNonNegativeInt(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}

function dirHasHtmlReports(dir: string): boolean {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return false;
  }
  return fs.readdirSync(dir).some((f) => f.endsWith('.html'));
}

for (const fixture of BUNDLE_EXPERIMENTAL_ANALYZE_FIXTURES) {
  const analyzeDir = resolveDir(fixture.analyzeDir);
  const hasArtifacts = fs.existsSync(path.join(analyzeDir, 'data', 'routes.json'));

  describe.skipIf(!hasArtifacts)(`bundle integration: ${fixture.name} (experimental-analyze)`, () => {
    it('parseNextjsBundleInput → bundleSignalSchema → buildHealthIngestPayload', () => {
      const bundle = parseNextjsBundleInput(analyzeDir);

      const parsed = bundleSignalSchema.safeParse(bundle);
      expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.format())).toBe(true);

      expect(bundle.routes.length).toBeGreaterThan(0);
      expect(isFiniteNonNegativeInt(bundle.totalBytes)).toBe(true);
      expect(isFiniteNonNegativeInt(bundle.jsBytes)).toBe(true);
      expect(isFiniteNonNegativeInt(bundle.cssBytes)).toBe(true);

      for (const r of bundle.routes) {
        expect(typeof r.path).toBe('string');
        expect(r.path.length).toBeGreaterThan(0);
        expect(isFiniteNonNegativeInt(r.totalBytes)).toBe(true);
      }

      const payload = buildHealthIngestPayload({ bundle });
      const ingest = healthIngestRequestSchema.safeParse(payload);
      expect(ingest.success, ingest.success ? '' : JSON.stringify(ingest.error.format())).toBe(true);
    });
  });
}

for (const fixture of WEBPACK_BUNDLE_ANALYZER_FIXTURES) {
  const analyzeDir = resolveDir(fixture.analyzeDir);
  const hasArtifacts = dirHasHtmlReports(analyzeDir);

  describe.skipIf(!hasArtifacts)(`bundle integration: ${fixture.name} (@next/bundle-analyzer)`, () => {
    it('writes HTML reports under .next/analyze (smoke; not parsed as BundleSignal)', () => {
      const names = fs.readdirSync(analyzeDir).filter((f) => f.endsWith('.html'));
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        const p = path.join(analyzeDir, name);
        expect(fs.statSync(p).size).toBeGreaterThan(0);
      }
    });
  });
}

// When artifacts are missing, suites above are skipped. Generate with `pnpm test:prep` from repo root
// (or `pnpm test`, which runs test:prep first).
