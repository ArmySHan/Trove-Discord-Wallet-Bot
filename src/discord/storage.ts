import { join } from 'node:path';
import type { Env } from '../config/env';
import { JsonFileStore } from '../core/storage/jsonStore';
import type { StorageStore } from '../core/storage/store';

let store: StorageStore | null = null;

/** The shared watchlist store (one JSON file under DATA_DIR). */
export function getStore(env: Env): StorageStore {
  return (store ??= new JsonFileStore(join(env.DATA_DIR, 'watchlists.json')));
}
