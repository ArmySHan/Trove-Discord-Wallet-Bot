import { describe, expect, it } from 'vitest';
import { aggregatePortfolio } from '../src/core/aggregator/aggregate';
import type { WalletProvider } from '../src/core/providers/WalletProvider';
import type { ProviderRouter } from '../src/core/providers/router';
import type { PriceClient } from '../src/core/prices/prices';
import type { TokenRegistry } from '../src/core/verify/tokenlist';
import type { ChainPortfolio } from '../src/core/models/portfolio';

const fakeProvider: WalletProvider = {
  id: 'fake',
  supports: () => true,
  async getBalances(_address, chain): Promise<ChainPortfolio> {
    if (chain.id === 'ethereum') {
      return {
        chainId: 'ethereum',
        name: 'Ethereum',
        native: { symbol: 'ETH', name: 'Ethereum', amount: 2, decimals: 18, isNative: true },
        tokens: [
          { symbol: 'USDC', name: 'USD Coin', contract: '0xusdc', amount: 100, decimals: 6 },
          // Priced, but not in the token list — an airdrop with a nominal price.
          {
            symbol: 'AIRDROP',
            name: 'Airdrop',
            contract: '0xairdrop',
            amount: 1_000_000,
            decimals: 18,
          },
          // No price at all.
          { symbol: 'SPAM', name: 'Spam', contract: '0xspam', amount: 999_999, decimals: 18 },
        ],
        defi: [],
        nfts: { count: 0 },
        totalUsd: 0,
      };
    }
    return {
      chainId: chain.id,
      name: chain.name,
      native: {
        symbol: chain.nativeSymbol,
        name: chain.name,
        amount: 0,
        decimals: 18,
        isNative: true,
      },
      tokens: [],
      defi: [],
      nfts: { count: 0 },
      totalUsd: 0,
    };
  },
};

const fakePrices: PriceClient = {
  async fetchPrices() {
    // ETH = $2000; USDC = $1; AIRDROP = $0.001; SPAM has no price.
    return new Map([
      ['coingecko:ethereum', 2000],
      ['ethereum:0xusdc', 1],
      ['ethereum:0xairdrop', 0.001],
    ]);
  },
};

// Only USDC is on the reputable list.
const fakeRegistry: TokenRegistry = {
  async ensureLoaded() {},
  isVerified: (_platform, contract) => contract.toLowerCase() === '0xusdc',
  getMetadata: () => undefined,
  isLoaded: () => true,
};

const fakeRouter: ProviderRouter = {
  providerIds: ['fake'],
  providersFor: () => [fakeProvider],
};

describe('aggregatePortfolio', () => {
  it('counts only verified, priced assets and discloses the rest', async () => {
    const portfolio = await aggregatePortfolio(
      { address: '0xabc', chainIds: ['ethereum', 'base'], router: fakeRouter },
      fakePrices,
      fakeRegistry,
    );

    // Headline: ETH 2 * 2000 = 4000 + USDC 100 * 1 = 100. AIRDROP (unverified) and SPAM (unpriced) excluded.
    expect(portfolio.totalUsd).toBeCloseTo(4100);
    // AIRDROP 1,000,000 * 0.001 = 1000, disclosed separately.
    expect(portfolio.unverifiedUsd).toBeCloseTo(1000);

    expect(portfolio.chains).toHaveLength(1); // base is empty -> dropped
    const eth = portfolio.chains[0];
    expect(eth?.chainId).toBe('ethereum');
    expect(eth?.totalUsd).toBeCloseTo(4100);
    expect(eth?.unverifiedUsd).toBeCloseTo(1000);

    const bySymbol = (s: string) => eth?.tokens.find((t) => t.symbol === s);
    expect(bySymbol('USDC')?.verified).toBe(true);
    expect(bySymbol('AIRDROP')?.verified).toBe(false);
    // Unpriced spam stays listed but carries no value.
    expect(bySymbol('SPAM')?.valueUsd).toBeUndefined();
  });

  it('preserves DeFi a provider returns from getBalances (e.g. Tron staking), not only via getDefi', async () => {
    const stakingProvider: WalletProvider = {
      id: 'staker',
      supports: () => true,
      async getBalances(_address, chain): Promise<ChainPortfolio> {
        return {
          chainId: chain.id,
          name: chain.name,
          native: {
            symbol: chain.nativeSymbol,
            name: chain.name,
            amount: 0,
            decimals: 18,
            isNative: true,
          },
          tokens: [],
          defi: [{ protocol: 'Staking', type: 'staking', items: [], valueUsd: 50 }],
          nfts: { count: 0 },
          totalUsd: 0,
        };
      },
    };
    const router: ProviderRouter = {
      providerIds: ['staker'],
      providersFor: () => [stakingProvider],
    };

    const portfolio = await aggregatePortfolio(
      { address: '0xabc', chainIds: ['ethereum'], router },
      fakePrices,
      fakeRegistry,
    );

    expect(portfolio.defiUsd).toBeCloseTo(50);
    expect(portfolio.chains[0]?.defi).toHaveLength(1);
  });
});
