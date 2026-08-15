/** Tiny per-key cooldown gate (used to rate-limit a user's commands/refreshes). */
const lastUse = new Map<string, number>();

/**
 * Returns the seconds remaining before `key` may act again, or 0 if it may act now. When allowed,
 * the cooldown window starts immediately, so a single call both checks and consumes the allowance.
 */
export function checkCooldown(key: string, seconds: number): number {
  const now = Date.now();
  const readyAt = (lastUse.get(key) ?? 0) + seconds * 1000;
  if (now < readyAt) {
    return Math.ceil((readyAt - now) / 1000);
  }
  lastUse.set(key, now);
  return 0;
}
