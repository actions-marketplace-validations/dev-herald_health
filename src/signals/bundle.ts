import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import type { BundleRoute, BundleSignal } from '../schemas/ingest-body';

/** One entry from `.next/diagnostics/route-bundle-stats.json` (Turbopack build stats). */
export interface NextjsRouteBundleStatEntry {
  route?: string;
  firstLoadUncompressedJsBytes?: number;
  firstLoadChunkPaths?: string[];
}

/** Shape of `analyze.data` JSON from `next experimental-analyze --output` (internal format, Next.js 16+). */
interface NextAnalyzeDataJson {
  sources?: unknown[];
  output_files: { filename: string }[];
  chunk_parts: {
    output_file_index: number;
    size: number;
    compressed_size: number;
  }[];
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

function parseAnalyzeDataFile(filePath: string): NextAnalyzeDataJson {
  const buf = fs.readFileSync(filePath);
  const s = buf.toString('utf8');
  const start = s.indexOf('{');
  if (start < 0) {
    throw new Error(`No JSON object in ${filePath}`);
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"' && !escape) {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(s.slice(start, i + 1)) as NextAnalyzeDataJson;
      }
    }
  }
  throw new Error(`Unclosed JSON in ${filePath}`);
}

function aggregateAnalyzeRoute(json: NextAnalyzeDataJson): {
  raw: number;
  gz: number;
  byFile: Map<string, { raw: number; gz: number }>;
} {
  const { output_files, chunk_parts } = json;
  const byIndexRaw = new Array(output_files.length).fill(0) as number[];
  const byIndexGz = new Array(output_files.length).fill(0) as number[];
  for (const part of chunk_parts) {
    const i = part.output_file_index;
    if (i < 0 || i >= output_files.length) continue;
    byIndexRaw[i] += part.size;
    byIndexGz[i] += part.compressed_size;
  }
  const byFile = new Map<string, { raw: number; gz: number }>();
  let raw = 0;
  let gz = 0;
  for (let i = 0; i < output_files.length; i++) {
    const name = output_files[i].filename;
    raw += byIndexRaw[i];
    gz += byIndexGz[i];
    byFile.set(name, { raw: byIndexRaw[i], gz: byIndexGz[i] });
  }
  return { raw, gz, byFile };
}

function routePathToAnalyzeDataPath(dataDir: string, route: string): string {
  if (route === '/') {
    return path.join(dataDir, 'analyze.data');
  }
  const seg = route.replace(/^\//, '');
  return path.join(dataDir, seg, 'analyze.data');
}

/**
 * Parse next experimental-analyze --output tree (.next/diagnostics/analyze) into the bundle ingest shape.
 * Reads data/routes.json and per-route analyze.data files emitted by Next.js.
 */
export function parseNextjsExperimentalAnalyzeOutput(analyzeDir: string): BundleSignal {
  const dataDir = path.join(analyzeDir, 'data');
  const routesPath = path.join(dataDir, 'routes.json');
  if (!isFile(routesPath)) {
    throw new Error(
      `Expected ${routesPath} from experimental-analyze output. Run: pnpm next experimental-analyze --output`
    );
  }
  const routesList = JSON.parse(fs.readFileSync(routesPath, 'utf8')) as unknown;
  if (!Array.isArray(routesList) || !routesList.every((r) => typeof r === 'string')) {
    throw new Error('routes.json must be a JSON array of route strings');
  }

  const routes: BundleRoute[] = [];
  const globalFileBytes = new Map<string, { raw: number; isJs: boolean; isCss: boolean }>();

  for (const route of routesList) {
    const analyzePath = routePathToAnalyzeDataPath(dataDir, route);
    if (!isFile(analyzePath)) continue;

    const json = parseAnalyzeDataFile(analyzePath);
    const { raw, gz, byFile } = aggregateAnalyzeRoute(json);

    routes.push({
      path: route,
      totalBytes: raw,
      uncompressedBytes: raw,
      compressedBytes: gz,
      moduleCount: json.sources?.length ?? json.output_files.length,
    });

    for (const [filename, { raw: fraw }] of byFile) {
      const isJs = filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.cjs');
      const isCss = filename.endsWith('.css');
      if (!isJs && !isCss) continue;
      const prev = globalFileBytes.get(filename);
      if (!prev) {
        globalFileBytes.set(filename, { raw: fraw, isJs, isCss });
      }
    }
  }

  let jsBytes = 0;
  let cssBytes = 0;
  for (const v of globalFileBytes.values()) {
    if (v.isJs) jsBytes += v.raw;
    else if (v.isCss) cssBytes += v.raw;
  }

  return {
    totalBytes: jsBytes + cssBytes,
    jsBytes,
    cssBytes,
    routes,
  };
}

/**
 * Resolve bundle input: either route-bundle-stats.json or a next experimental-analyze --output directory.
 */
export function parseNextjsBundleInput(resolvedPath: string): BundleSignal {
  let st: fs.Stats;
  try {
    st = fs.statSync(resolvedPath);
  } catch {
    throw new Error(`Bundle path not found: ${resolvedPath}`);
  }

  if (st.isDirectory()) {
    return parseNextjsExperimentalAnalyzeOutput(resolvedPath);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Bundle file is not valid JSON: ${resolvedPath}`);
  }
  if (Array.isArray(parsed)) {
    return parseNextjsBundleStats(resolvedPath);
  }
  throw new Error(
    `Expected a JSON array (route-bundle-stats.json) or a directory from next experimental-analyze --output: ${resolvedPath}`
  );
}

/**
 * Parse Turbopack route-bundle-stats.json into the Dev Herald bundle ingest shape.
 * Expects chunk files to exist on disk under the inferred .next directory.
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
