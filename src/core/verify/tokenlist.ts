import { httpJson } from '../../util/http';
import { logger } from '../../util/logger';
import { normalizeContract } from '../../util/format';

/** Minimal token metadata from a reputable list (used to enrich providers that omit it, e.g. Tron). */
export interface TokenMeta {
  symbol: string;
  decimals: number;
}

/**
 * Decides whether a token is "verified" — i.e. present in a reputable token list — and exposes its
 * basic metadata. The aggregator uses verification to keep airdrop spam (which can carry a nominal
 * market price) out of the headline total; providers that don't return token decimals/symbols (Tron)
 * use the metadata. Abstracted so the aggregator can be unit-tested without the network.
 */
export interface TokenRegistry {
  /** Load (and cache) the lists for the given CoinGecko platform ids. Safe to call repeatedly. */
  ensureLoaded(platforms: string[]): Promise<void>;
  /** True if the contract is in the platform's list. Native coins are handled by the caller. */
  isVerified(platform: string, contract: string): boolean;
  /** Symbol + decimals for a listed contract, or undefined if not listed. */
  getMetadata(platform: string, contract: string): TokenMeta | undefined;
  /** Whether the platform's list is loaded — lets callers tell "absent" from "not listed". */
  isLoaded(platform: string): boolean;
}

interface CoinGeckoTokenList {
  tokens?: Array<{ address?: string; symbol?: string; decimals?: number }>;
}

const TTL_MS = 12 * 60 * 60 * 1000; // refresh lists twice a day

/** Loads one platform's tokens, keyed by normalized contract address, with their metadata. */
export type ListLoader = (platform: string) => Promise<Map<string, TokenMeta>>;

/**
 * Default loader: CoinGecko's public token lists, served from a CDN host (tokens.coingecko.com)
 * that is separate from the rate-limited API. One small request per chain, cached for hours.
 */
export const coinGeckoListLoader: ListLoader = async (platform) => {
  const data = await httpJson<CoinGeckoTokenList>(
    `https://tokens.coingecko.com/${platform}/all.json`,
  );
  const map = new Map<string, TokenMeta>();
  for (const token of data.tokens ?? []) {
    if (token.address) {
      map.set(normalizeContract(token.address), {
        symbol: token.symbol ?? '?',
        decimals: typeof token.decimals === 'number' ? token.decimals : 0,
      });
    }
  }
  return map;
};

export class CoinGeckoTokenRegistry implements TokenRegistry {
  private readonly lists = new Map<string, Map<string, TokenMeta>>();
  private readonly loadedAt = new Map<string, number>();
  private readonly inflight = new Map<string, Promise<void>>();

  constructor(private readonly loader: ListLoader = coinGeckoListLoader) {}

  async ensureLoaded(platforms: string[]): Promise<void> {
    await Promise.all([...new Set(platforms)].filter(Boolean).map((p) => this.loadOne(p)));
  }

  private loadOne(platform: string): Promise<void> {
    const freshUntil = (this.loadedAt.get(platform) ?? 0) + TTL_MS;
    if (this.lists.has(platform) && Date.now() < freshUntil) {
      return Promise.resolve();
    }
    const existing = this.inflight.get(platform);
    if (existing) {
      return existing;
    }
    const task = (async () => {
      try {
        const list = await this.loader(platform);
        this.lists.set(platform, list);
        this.loadedAt.set(platform, Date.now());
      } catch (err) {
        // Keep any previously loaded list; if there is none, isVerified falls back to "verified"
        // so an unreachable list never hides a wallet's legitimate value.
        logger.warn({ err, platform }, 'Token list load failed');
      } finally {
        this.inflight.delete(platform);
      }
    })();
    this.inflight.set(platform, task);
    return task;
  }

  isVerified(platform: string, contract: string): boolean {
    const list = this.lists.get(platform);
    if (!list) {
      return true; // fail-soft: no list -> do not penalize the token
    }
    return list.has(normalizeContract(contract));
  }

  getMetadata(platform: string, contract: string): TokenMeta | undefined {
    return this.lists.get(platform)?.get(normalizeContract(contract));
  }

  isLoaded(platform: string): boolean {
    return this.lists.has(platform);
  }
}

export const tokenRegistry: TokenRegistry = new CoinGeckoTokenRegistry();
