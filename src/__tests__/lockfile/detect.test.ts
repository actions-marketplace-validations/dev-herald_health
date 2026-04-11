import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, it } from 'vitest';
import { detectAdapter, inferLockfileTypeFromFilename, inferPmNameFromFilename } from '../../lockfile/detect';

describe('detectAdapter', () => {
  it('prefers pnpm when multiple lockfiles exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'health-lock-'));
    try {
      writeFileSync(join(dir, 'package-lock.json'), '{"lockfileVersion":3,"packages":{}}');
      writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
      expect(detectAdapter(dir).adapter.pmName).toBe('pnpm');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('respects lockfile-path override', () => {
    const dir = mkdtempSync(join(tmpdir(), 'health-lock-'));
    try {
      const yarnPath = join(dir, 'yarn.lock');
      writeFileSync(yarnPath, '__metadata:\n  version: 8\n');
      const r = detectAdapter(dir, yarnPath);
      expect(r.adapter.pmName).toBe('yarn');
      expect(r.lockfilePath).toBe(yarnPath);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('inferPmNameFromFilename', () => {
  it('maps known filenames', () => {
    expect(inferPmNameFromFilename('pnpm-lock.yaml')).toBe('pnpm');
    expect(inferPmNameFromFilename('bun.lock')).toBe('bun');
  });
});

describe('inferLockfileTypeFromFilename (alias)', () => {
  it('matches inferPmNameFromFilename', () => {
    expect(inferLockfileTypeFromFilename('package-lock.json')).toBe('npm');
  });
});
