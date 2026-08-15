import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonFileStore } from '../src/core/storage/jsonStore';
import { MAX_WATCH_PER_USER } from '../src/core/storage/store';

const file = join(tmpdir(), 'trove-watch-test.json');

async function cleanup() {
  await rm(file, { force: true });
  await rm(`${file}.tmp`, { force: true });
}

describe('JsonFileStore', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it('adds, lists, dedupes (case-insensitive for EVM), and removes', async () => {
    const store = new JsonFileStore(file);
    expect(await store.addWatch('u1', { address: '0xABC', addedAt: 1 })).toBe('added');
    expect(await store.addWatch('u1', { address: '0xabc', addedAt: 2 })).toBe('exists');
    expect((await store.listWatch('u1')).length).toBe(1);

    expect(await store.removeWatch('u1', '0xAbC')).toBe(true);
    expect((await store.listWatch('u1')).length).toBe(0);
    expect(await store.removeWatch('u1', '0xabc')).toBe(false);
  });

  it('persists across instances and isolates users', async () => {
    const a = new JsonFileStore(file);
    await a.addWatch('u1', { address: '0x1', addedAt: 1 });
    await a.addWatch('u2', { address: '0x2', addedAt: 1 });

    const b = new JsonFileStore(file); // a fresh instance reads the file from disk
    expect((await b.listWatch('u1')).map((e) => e.address)).toEqual(['0x1']);
    expect((await b.listWatch('u2')).length).toBe(1);
  });

  it('enforces the per-user limit', async () => {
    const store = new JsonFileStore(file);
    for (let i = 0; i < MAX_WATCH_PER_USER; i++) {
      expect(await store.addWatch('u1', { address: `0x${i}`, addedAt: i })).toBe('added');
    }
    expect(await store.addWatch('u1', { address: '0xover', addedAt: 99 })).toBe('full');
  });
});
