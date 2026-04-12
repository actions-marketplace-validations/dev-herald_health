import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import type { BundleRoute, BundleSignal } from '../schemas/ingest-body';

/** One entry from `.next/diagnostics/route-bundle-stats.json` (Turbopack, Next.js 16.2+). */
export interface NextjsRouteBundleStatEntry {
  route?: string;
  firstLoadUncompressedJsBytes?: number;
  firstLoadChunkPaths?: string[];
}

export function findDotNextDir(statsFilePath: string): string {
  const resolved = path.resolve(statsFilePath);
  const segments = resolved.split(path.sep);
  const idx = segments.lastIndexOf('.next');
  if (idx < 0) {
    return path.resolve('.next');
  }
  return segments.slice(0, idx + 1).join(path.sep);
}

function normalizeChunkRelative(chunkPath: string): string {
  let rel = chunkPath.replace(/\\/g, '/');
  if (rel.startsWith('./')) {
    rel = rel.slice(2);
  }
  if (rel.startsWith('.next/')) {
    rel = rel.slice('.next/'.length);
  }
  return rel;
}

function resolveChunkFile(dotNextDir: string, chunkPath: string): string {
  return path.join(dotNextDir, ...normalizeChunkRelative(chunkPath).split('/'));
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function fileSize(p: string): number {
  return fs.statSync(p).size;
}

function gzipLength(p: string): number {
  const buf = fs.readFileSync(p);
  return zlib.gzipSync(buf).length;
}

/**
 * Parse Turbopack `route-bundle-stats.json` into the Dev Herald `bundle` ingest shape.
 * Expects chunk files to exist on disk under the inferred `.next` directory.
 */
export function parseNextjsBundleStats(statsPath: string): BundleSignal {
  const raw = fs.readFileSync(statsPath, 'utf8');
  const stats = JSON.parse(raw) as unknown;
  if (!Array.isArray(stats)) {
    throw new Error('Expected Turbopack route-bundle-stats.json to be a JSON array');
  }

  const entries = stats as NextjsRouteBundleStatEntry[];
  const dotNextDir = findDotNextDir(statsPath);

  const routesWithContent = entries.filter(
    (e) => typeof e.route === 'string' && e.route.length > 0 && (e.firstLoadUncompressedJsBytes ?? 0) > 0
  );

  const allChunkSets = routesWithContent.map(
    (e) => new Set((e.firstLoadChunkPaths ?? []).filter((c) => c.endsWith('.js')))
  );

  const sharedJsChunks = new Set<string>();
  if (allChunkSets.length > 0) {
    for (const chunk of allChunkSets[0]) {
      if (allChunkSets.every((s) => s.has(chunk))) {
        sharedJsChunks.add(chunk);
      }
    }
  }

  const jsChunkPaths = new Set<string>();
  const cssChunkPaths = new Set<string>();

  for (const e of entries) {
    for (const c of e.firstLoadChunkPaths ?? []) {
      if (c.endsWith('.js')) jsChunkPaths.add(c);
      else if (c.endsWith('.css')) cssChunkPaths.add(c);
    }
  }

  let jsBytes = 0;
  for (const c of jsChunkPaths) {
    const abs = resolveChunkFile(dotNextDir, c);
    if (isFile(abs)) {
      jsBytes += fileSize(abs);
    }
  }

  let cssBytes = 0;
  for (const c of cssChunkPaths) {
    const abs = resolveChunkFile(dotNextDir, c);
    if (isFile(abs)) {
      cssBytes += fileSize(abs);
    }
  }

  const routes: BundleRoute[] = [];

  for (const entry of routesWithContent) {
    const routePath = entry.route as string;
    const uncompressed = entry.firstLoadUncompressedJsBytes ?? 0;
    let compressed = 0;

    for (const chunk of entry.firstLoadChunkPaths ?? []) {
      if (!chunk.endsWith('.js')) continue;
      if (sharedJsChunks.has(chunk)) continue;
      const abs = resolveChunkFile(dotNextDir, chunk);
      if (isFile(abs)) {
        compressed += gzipLength(abs);
      }
    }

    routes.push({
      path: routePath,
      totalBytes: uncompressed,
      uncompressedBytes: uncompressed,
      compressedBytes: compressed,
      moduleCount: (entry.firstLoadChunkPaths ?? []).length,
    });
  }

  return {
    totalBytes: jsBytes + cssBytes,
    jsBytes,
    cssBytes,
    routes,
  };
}
