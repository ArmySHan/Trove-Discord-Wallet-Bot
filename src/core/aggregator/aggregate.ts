import pLimit from 'p-limit';
import { getChain, type Chain } from '../../config/chains';
import type { ChainPortfolio, DefiPosition, WalletPortfolio } from '../models/portfolio';
import type { ProviderRouter } from '../providers/router';
import { defiLlamaPriceClient, nativeKey, tokenKey, type PriceClient } from '../prices/prices';
import { tokenRegistry, type TokenRegistry } from '../verify/tokenlist';
import { logger } from '../../util/logger';

export interface AggregateOptions {
  address: string;
  ens?: string;
  chainIds: string[];
  router: ProviderRouter;
}

const CHAIN_CONCURRENCY = 5;

/**
 * Builds a normalized portfolio: for each chain, tries the configured providers in preference order
 * until one succeeds (fail-over), fills any missing prices, classifies tokens against a reputable
 * list, computes totals, and drops empty chains.
 *
 * Two rules keep the headline total honest:
 *   1. Unpriced assets contribute nothing (a wallet of priceless spam shows no inflated value).
 *   2. Priced-but-unverified tokens (airdrop spam with a nominal price) are disclosed separately,
 *      not folded into the headline.
 */
export async function aggregatePortfolio(
  opts: AggregateOptions,
  priceClient: PriceClient = defiLlamaPriceClient,
  registry: TokenRegistry = tokenRegistry,
): Promise<WalletPortfolio> {
  const chains = opts.chainIds
    .map((id) => getChain(id))
    .filter((c): c is Chain => Boolean(c) && opts.router.providersFor(c as Chain).length > 0);

  const limit = pLimit(CHAIN_CONCURRENCY);
  let partial = false;
  const sources = new Set<string>();

  const fetchBalances = async (chain: Chain): Promise<ChainPortfolio | undefined> => {
    for (const provider of opts.router.providersFor(chain)) {
      try {
        const result = await provider.getBalances(opts.address, chain);
        sources.add(provider.id);
        return result;
      } catch (err) {
        logger.warn(
          { err, chain: chain.id, provider: provider.id },
          'Provider failed; trying next',
        );
      }
    }
    return undefined;
  };

  const fetchDefi = async (chain: Chain): Promise<DefiPosition[]> => {
    const provider = opts.router.providersFor(chain).find((p) => p.getDefi);
    if (!provider?.getDefi) {
      return [];
    }
    try {
      const defi = await provider.getDefi(opts.address, chain);
      if (defi.length > 0) {
        sources.add(provider.id);
      }
      return defi;
    } catch (err) {
      logger.warn({ err, chain: chain.id, provider: provider.id }, 'DeFi fetch failed');
      return []; // best-effort: DeFi never blocks the balances result
    }
  };

  const results = await Promise.all(
    chains.map((chain) =>
      limit(async () => {
        // Balances (with provider fail-over) and DeFi positions run concurrently per chain.
        const [cp, defi] = await Promise.all([fetchBalances(chain), fetchDefi(chain)]);
        if (!cp) {
          partial = true; // every provider for this chain failed
          return undefined;
        }
        // Merge, don't overwrite: a provider may return DeFi directly in getBalances (e.g. Tron
        // staking) in addition to anything a getDefi-capable provider supplies.
        cp.defi = [...cp.defi, ...defi];
        return cp;
      }),
    ),
  );

  const portfolios = results.filter((r): r is ChainPortfolio => Boolean(r));

  await fillPrices(portfolios, priceClient);
  await classifyTokens(portfolios, registry);

  let totalUsd = 0;
  let unverifiedUsd = 0;
  let defiUsd = 0;
  for (const cp of portfolios) {
    const sums = sumChain(cp);
    cp.totalUsd = sums.verified;
    cp.unverifiedUsd = sums.unverified;
    totalUsd += sums.verified;
    unverifiedUsd += sums.unverified;
    defiUsd += defiSum(cp);
  }

  const nonEmpty = portfolios
    .filter(
      (c) =>
        c.totalUsd > 0 ||
        (c.unverifiedUsd ?? 0) > 0 ||
        c.defi.length > 0 ||
        c.native.amount > 0 ||
        c.tokens.length > 0,
    )
    .sort((a, b) => b.totalUsd + defiSum(b) - (a.totalUsd + defiSum(a)));

  return {
    address: opts.address,
    ens: opts.ens,
    totalUsd,
    unverifiedUsd,
    defiUsd,
    chains: nonEmpty,
    fetchedAt: Date.now(),
    partial,
    sources: [...sources],
  };
}

/** Total USD across a chain's DeFi positions. */
function defiSum(cp: ChainPortfolio): number {
  return cp.defi.reduce((acc, position) => acc + position.valueUsd, 0);
}

/** Marks each token verified/unverified using the reputable token list for its chain. */
async function classifyTokens(
  portfolios: ChainPortfolio[],
  registry: TokenRegistry,
): Promise<void> {
  const platforms = portfolios
    .map((cp) => getChain(cp.chainId)?.coinGeckoPlatform)
    .filter((p): p is string => Boolean(p));
  await registry.ensureLoaded(platforms);

  for (const cp of portfolios) {
    const chain = getChain(cp.chainId);
    if (!chain) {
      continue;
    }
    for (const token of cp.tokens) {
      if (token.isSpam) {
        token.verified = false; // honor a provider's explicit spam flag
        continue;
      }
      token.verified = token.contract
        ? registry.isVerified(chain.coinGeckoPlatform, token.contract)
        : true;
    }
  }
}

async function fillPrices(portfolios: ChainPortfolio[], priceClient: PriceClient): Promise<void> {
  // Some providers (Covalent, Moralis) already attach USD prices; only the gaps (e.g. Alchemy's
  // tokens) need a lookup. Collect keys for unpriced assets and fetch them in one batched call.
  const keys: string[] = [];
  for (const cp of portfolios) {
    const chain = getChain(cp.chainId);
    if (!chain) {
      continue;
    }
    if (cp.native.priceUsd === undefined) {
      keys.push(nativeKey(chain.nativeCoinGeckoId));
    }
    for (const token of cp.tokens) {
      if (token.priceUsd === undefined && token.contract) {
        keys.push(tokenKey(chain.defiLlamaChain, token.contract));
      }
    }
  }

  const prices = keys.length
    ? await priceClient.fetchPrices(keys).catch(() => new Map<string, number>())
    : new Map<string, number>();

  for (const cp of portfolios) {
    const chain = getChain(cp.chainId);
    if (!chain) {
      continue;
    }

    if (cp.native.priceUsd === undefined) {
      cp.native.priceUsd = prices.get(nativeKey(chain.nativeCoinGeckoId));
    }
    if (cp.native.priceUsd !== undefined) {
      cp.native.valueUsd = cp.native.amount * cp.native.priceUsd;
    }

    for (const token of cp.tokens) {
      if (token.priceUsd === undefined && token.contract) {
        token.priceUsd = prices.get(tokenKey(chain.defiLlamaChain, token.contract));
      }
      if (token.priceUsd !== undefined) {
        token.valueUsd = token.amount * token.priceUsd;
      }
    }

    cp.tokens.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
  }
}

/**
 * Splits a chain's priced value into a verified headline figure and a disclosed unverified figure.
 * The native coin is always verified; unpriced tokens contribute to neither.
 */
function sumChain(cp: ChainPortfolio): { verified: number; unverified: number } {
  let verified = cp.native.valueUsd ?? 0;
  let unverified = 0;
  for (const token of cp.tokens) {
    const value = token.valueUsd ?? 0;
    if (token.verified === false) {
      unverified += value;
    } else {
      verified += value;
    }
  }
  return { verified, unverified };
}
