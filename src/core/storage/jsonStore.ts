import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { normalizeContract } from '../../util/format';
import { logger } from '../../util/logger';
import { MAX_WATCH_PER_USER, type AddResult, type StorageStore, type WatchEntry } from './store';

type Db = Record<string, WatchEntry[]>;

/**
 * A dependency-free JSON-file `StorageStore`. The whole DB is small (per-user lists of addresses),
 * so it is held in memory and written back atomically (temp file + rename) on each change. Writes
 * are serialized to avoid interleaving. Swap this for a SQL-backed store later without touching the
 * commands — they only depend on the `StorageStore` interface.
 */
export class JsonFileStore implements StorageStore {
  private dbPromise: Promise<Db> | null = null;
  private writing: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async listWatch(userId: string): Promise<WatchEntry[]> {
    const db = await this.load();
    return [...(db[userId] ?? [])];
  }

  async addWatch(userId: string, entry: WatchEntry): Promise<AddResult> {
    const db = await this.load();
    const list = (db[userId] ??= []);
    if (list.some((e) => sameAddress(e.address, entry.address))) {
      return 'exists';
    }
    if (list.length >= MAX_WATCH_PER_USER) {
      return 'full';
    }
    list.push(entry);
    await this.persist(db);
    return 'added';
  }

  async removeWatch(userId: string, address: string): Promise<boolean> {
    const db = await this.load();
    const list = db[userId];
    if (!list) {
      return false;
    }
    const next = list.filter((e) => !sameAddress(e.address, address));
    if (next.length === list.length) {
      return false;
    }
    db[userId] = next;
    await this.persist(db);
    return true;
  }

  /** Memoized so concurrent first-callers share one read (and one Db object) — no lost updates. */
  private load(): Promise<Db> {
    return (this.dbPromise ??= this.readDb());
  }

  private async readDb(): Promise<Db> {
    try {
      return JSON.parse(await readFile(this.filePath, 'utf8')) as Db;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn({ err }, 'Could not read watchlist store; starting empty');
      }
      return {};
    }
  }

  private async persist(db: Db): Promise<void> {
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      await writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
      await rename(tmp, this.filePath);
    });
    await this.writing;
  }
}

function sameAddress(a: string, b: string): boolean {
  return normalizeContract(a) === normalizeContract(b);
}
