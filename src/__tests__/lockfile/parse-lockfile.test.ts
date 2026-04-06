import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, it } from 'vitest';
import { parseLockfile } from '../../lockfile/parse-lockfile';

describe('parseLockfile', () => {
  it('returns no dependencies for yarn lockfile (CVE extraction unsupported)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'health-yarn-'));
    try {
      const path = join(dir, 'yarn.lock');
      writeFileSync(path, '# yarn lockfile v1\nlodash@^4:\n  version "4.17.21"\n');
      expect(parseLockfile('yarn', path)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('returns no dependencies for bun lockfile (CVE extraction unsupported)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'health-bun-'));
    try {
      const path = join(dir, 'bun.lock');
      writeFileSync(path, '{"lockfileVersion":1}\n');
      expect(parseLockfile('bun', path)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
