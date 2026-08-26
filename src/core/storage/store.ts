/** A wallet address a Discord user has saved to track with /portfolio. */
export interface WatchEntry {
  address: string;
  label?: string;
  addedAt: number;
}

export type AddResult = 'added' | 'exists' | 'full';

/** Per-user persistence of watched addresses. Abstracted so the backend can be swapped later. */
export interface StorageStore {
  listWatch(userId: string): Promise<WatchEntry[]>;
  addWatch(userId: string, entry: WatchEntry): Promise<AddResult>;
  removeWatch(userId: string, address: string): Promise<boolean>;
}

/** Keep lists small — also stays within Discord's 25-option select-menu limit. */
export const MAX_WATCH_PER_USER = 25;
