import { describe, expect, it } from 'vitest';
import { flattenPnpmListOutput } from '../../lockfile/adapters/pnpm';

describe('flattenPnpmListOutput', () => {
  it('marks prod vs dev at workspace top level', () => {
    const deps = flattenPnpmListOutput([
      {
        dependencies: { lodash: { version: '4.17.21' } },
        devDependencies: { typescript: { version: '5.9.3' } },
      },
    ]);
    expect(deps.find((d) => d.name === 'lodash')?.isDev).toBe(false);
    expect(deps.find((d) => d.name === 'typescript')?.isDev).toBe(true);
  });

  it('classifies distinct next versions in prod vs dev workspace trees', () => {
    const deps = flattenPnpmListOutput([
      { dependencies: { next: { version: '16.2.2' } } },
      {
        devDependencies: {
          '@react-email/components': {
            version: '1.0.0',
            dependencies: { next: { version: '15.0.0' } },
          },
        },
      },
    ]);
    expect(deps.find((d) => d.name === 'next' && d.version === '16.2.2')?.isDev).toBe(false);
    expect(deps.find((d) => d.name === 'next' && d.version === '15.0.0')?.isDev).toBe(true);
    expect(deps.find((d) => d.name === '@react-email/components')?.isDev).toBe(true);
  });

  it('classifies transitive vite under dev-only vitest as dev', () => {
    const deps = flattenPnpmListOutput([
      {
        devDependencies: {
          vitest: { version: '1.0.0', dependencies: { vite: { version: '2.0.0' } } },
        },
      },
    ]);
    expect(deps.find((d) => d.name === 'vitest')?.isDev).toBe(true);
    expect(deps.find((d) => d.name === 'vite')?.isDev).toBe(true);
  });

  it('treats a package reachable from prod as prod even when also listed under dev (prod wins)', () => {
    const deps = flattenPnpmListOutput([
      {
        dependencies: { shared: { version: '1.0.0' } },
        devDependencies: {
          'dev-consumer': { version: '1.0.0' },
          shared: { version: '1.0.0' },
        },
      },
    ]);
    expect(deps.find((d) => d.name === 'shared')?.isDev).toBe(false);
    expect(deps.find((d) => d.name === 'dev-consumer')?.isDev).toBe(true);
  });
});
