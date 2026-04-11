import { describe, expect, it } from 'vitest';
import { bunAdapter } from '../../lockfile/adapters/bun';
import { yarnAdapter } from '../../lockfile/adapters/yarn';

describe('unsupported adapters', () => {
  it('yarn returns no dependencies', async () => {
    expect(yarnAdapter.supported).toBe(false);
    expect(await yarnAdapter.listDeps('/tmp', '/tmp/yarn.lock')).toEqual([]);
  });

  it('bun returns no dependencies', async () => {
    expect(bunAdapter.supported).toBe(false);
    expect(await bunAdapter.listDeps('/tmp', '/tmp/bun.lock')).toEqual([]);
  });
});
