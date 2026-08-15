import { defaultChains, type Env } from '../../config/env';
import { buildRouter, type ProviderRouter } from '../../core/providers/router';
import { aggregatePortfolio } from '../../core/aggregator/aggregate';
import { detectEcosystem } from '../../core/ens/resolve';
import { MemoryCache } from '../../core/cache/cache';
import type { WalletPortfolio } from '../../core/models/portfolio';

/**
 * Shared wallet state for the Discord layer. Both the `/wallet` command and its message components
 * read through the same cache and router, so drill-down/pagination are served from cache and only
 * a miss (or an explicit refresh) re-aggregates.
 */
const cache = new MemoryCache();
let router: ProviderRouter | null = null;

export function getRouter(env: Env): ProviderRouter {
  return (router ??= buildRouter(env));
}

/** Returns a cached portfolio without hitting the network (undefined if absent/expired). */
export function peekPortfolio(address: string): WalletPortfolio | undefined {
  return cache.get<WalletPortfolio>(key(address));
}

/** Cache-first portfolio load. `force` bypasses the cache (used by the Refresh button). */
export async function loadPortfolio(
  address: string,
  ens: string | undefined,
  env: Env,
  opts: { force?: boolean } = {},
): Promise<WalletPortfolio> {
  const k = key(address);
  if (!opts.force) {
    const cached = cache.get<WalletPortfolio>(k);
    if (cached) {
      return cached;
    }
  }

  // Preserve a previously resolved ENS name across refreshes / component re-fetches.
  const resolvedEns = ens ?? cache.get<WalletPortfolio>(k)?.ens;
  const portfolio = await aggregatePortfolio({
    address,
    ens: resolvedEns,
    chainIds: chainsForAddress(address, env),
    router: getRouter(env),
  });
  cache.set(k, portfolio, env.CACHE_TTL_SECONDS);
  return portfolio;
}

/**
 * Chains to query for an address: its own single chain for non-EVM ecosystems (Bitcoin, Litecoin,
 * Dogecoin, Bitcoin Cash, Solana — each ecosystem name is its chain id), the EVM sweep otherwise.
 */
function chainsForAddress(address: string, env: Env): string[] {
  const ecosystem = detectEcosystem(address);
  if (ecosystem === 'evm' || ecosystem === 'unknown') {
    return defaultChains(env);
  }
  return [ecosystem];
}

function key(address: string): string {
  return `wallet:${address.toLowerCase()}`;
}
