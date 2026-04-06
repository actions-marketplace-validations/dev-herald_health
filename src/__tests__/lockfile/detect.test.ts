import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, it } from 'vitest';
import { detectLockfile, inferLockfileTypeFromFilename } from '../../lockfile/detect';

describe('detectLockfile', () => {
  it('prefers pnpm when multiple lockfiles exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'health-lock-'));
    try {
      writeFileSync(join(dir, 'package-lock.json'), '{"lockfileVersion":3,"packages":{}}');
      writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
      expect(detectLockfile(dir).type).toBe('pnpm');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('respects lockfile-path override', () => {
    const dir = mkdtempSync(join(tmpdir(), 'health-lock-'));
    try {
      const yarnPath = join(dir, 'yarn.lock');
      writeFileSync(yarnPath, '__metadata:\n  version: 8\n');
      const r = detectLockfile(dir, yarnPath);
      expect(r.type).toBe('yarn');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('inferLockfileTypeFromFilename', () => {
  it('maps known filenames', () => {
    expect(inferLockfileTypeFromFilename('pnpm-lock.yaml')).toBe('pnpm');
    expect(inferLockfileTypeFromFilename('bun.lock')).toBe('bun');
  });
});
