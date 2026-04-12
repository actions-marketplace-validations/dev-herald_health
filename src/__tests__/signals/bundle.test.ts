import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseNextjsBundleStats } from '../../signals/bundle';

describe('parseNextjsBundleStats', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp && fs.existsSync(tmp)) {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('parses Turbopack route-bundle-stats and sums unique JS chunks', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-bundle-'));
    const dotNext = path.join(tmp, '.next');
    const diag = path.join(dotNext, 'diagnostics');
    const chunks = path.join(dotNext, 'static', 'chunks');
    fs.mkdirSync(chunks, { recursive: true });
    fs.writeFileSync(path.join(chunks, 'shared.js'), 'shared-chunk');
    fs.writeFileSync(path.join(chunks, 'page-a.js'), 'page-a-chunk');
    fs.writeFileSync(path.join(chunks, 'page-b.js'), 'page-b-chunk');

    const statsPath = path.join(diag, 'route-bundle-stats.json');
    fs.mkdirSync(diag, { recursive: true });
    fs.writeFileSync(
      statsPath,
      JSON.stringify([
        {
          route: '/',
          firstLoadUncompressedJsBytes: 100,
          firstLoadChunkPaths: [
            '.next/static/chunks/shared.js',
            '.next/static/chunks/page-a.js',
          ],
        },
        {
          route: '/dashboard',
          firstLoadUncompressedJsBytes: 200,
          firstLoadChunkPaths: [
            '.next/static/chunks/shared.js',
            '.next/static/chunks/page-b.js',
          ],
        },
      ])
    );

    const bundle = parseNextjsBundleStats(statsPath);

    const sharedSize = fs.statSync(path.join(chunks, 'shared.js')).size;
    const aSize = fs.statSync(path.join(chunks, 'page-a.js')).size;
    const bSize = fs.statSync(path.join(chunks, 'page-b.js')).size;

    expect(bundle.jsBytes).toBe(sharedSize + aSize + bSize);
    expect(bundle.cssBytes).toBe(0);
    expect(bundle.totalBytes).toBe(bundle.jsBytes);
    expect(bundle.routes).toHaveLength(2);
    expect(bundle.routes[0].path).toBe('/');
    expect(bundle.routes[0].totalBytes).toBe(100);
    expect(bundle.routes[0].uncompressedBytes).toBe(100);
    expect(bundle.routes[0].moduleCount).toBe(2);
    // shared chunk gzip excluded from per-route compressed sum
    expect(bundle.routes[0].compressedBytes).toBeGreaterThan(0);
    expect(bundle.routes[1].compressedBytes).toBeGreaterThan(0);
  });

  it('throws when JSON is not an array', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-bundle-'));
    const dotNext = path.join(tmp, '.next');
    const diag = path.join(dotNext, 'diagnostics');
    fs.mkdirSync(diag, { recursive: true });
    const statsPath = path.join(diag, 'route-bundle-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify({ not: 'array' }));

    expect(() => parseNextjsBundleStats(statsPath)).toThrow(/JSON array/);
  });
});
