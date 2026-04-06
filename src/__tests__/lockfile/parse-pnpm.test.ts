import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { collectPnpmImporterProdDev, parsePnpmLockfile, parsePnpmPackageKey } from '../../lockfile/parse-pnpm';

describe('parsePnpmPackageKey', () => {
  it('strips peer suffix', () => {
    expect(parsePnpmPackageKey('vitest@4.1.2(@types/node@20.19.37)')).toEqual({
      name: 'vitest',
      version: '4.1.2',
    });
  });
});

describe('parsePnpmLockfile', () => {
  it('marks prod vs dev', () => {
    const raw = readFileSync(join(__dirname, '../fixtures/pnpm-lock-mini.yaml'), 'utf8');
    const deps = parsePnpmLockfile(raw);
    expect(deps.find((d) => d.name === 'lodash')?.isDev).toBe(false);
    expect(deps.find((d) => d.name === 'typescript')?.isDev).toBe(true);
  });

  it('collects importers', () => {
    const raw = readFileSync(join(__dirname, '../fixtures/pnpm-lock-mini.yaml'), 'utf8');
    const { prod, dev } = collectPnpmImporterProdDev(raw);
    expect(prod.has('lodash@4.17.21')).toBe(true);
    expect(dev.has('typescript@5.9.3')).toBe(true);
  });
});
