import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseNpmLockfile, pathToPackageName } from '../../lockfile/parse-npm';

describe('pathToPackageName', () => {
  it('handles npm workspaces paths', () => {
    expect(pathToPackageName('packages/web/node_modules/react')).toBe('react');
  });
});

describe('parseNpmLockfile', () => {
  it('parses lockfile v3', () => {
    const raw = readFileSync(join(__dirname, '../fixtures/package-lock-v3-mini.json'), 'utf8');
    const deps = parseNpmLockfile(raw);
    expect(deps.find((d) => d.name === 'lodash')?.isDev).toBe(false);
    expect(deps.find((d) => d.name === 'eslint')?.isDev).toBe(true);
  });
});
