import { describe, expect, it } from 'vitest';
import { mapMoralis, type MoralisToken } from '../src/core/providers/moralis/mapper';
import { getChain } from '../src/config/chains';

const eth = getChain('ethereum')!;

describe('mapMoralis', () => {
  it('maps native and tokens with inline prices and honors the spam flag', () => {
    const items: MoralisToken[] = [
      {
        symbol: 'ETH',
        decimals: 18,
        balance: '1000000000000000000',
        usd_price: 2000,
        native_token: true,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        balance: '50000000',
        usd_price: 1,
        token_address: '0xusdc',
      },
      {
        symbol: 'SCAM',
        name: 'Scam',
        decimals: 18,
        balance: '999000000000000000000',
        usd_price: 0.1,
        token_address: '0xscam',
        possible_spam: true,
      },
    ];

    const cp = mapMoralis(items, eth);

    expect(cp.native.amount).toBeCloseTo(1);
    expect(cp.native.priceUsd).toBe(2000);

    const usdc = cp.tokens.find((t) => t.symbol === 'USDC');
    expect(usdc?.amount).toBeCloseTo(50);
    expect(usdc?.priceUsd).toBe(1);

    const scam = cp.tokens.find((t) => t.symbol === 'SCAM');
    expect(scam?.isSpam).toBe(true);
  });

  it('treats a 0 price as unpriced so the aggregator can fall back to DefiLlama', () => {
    const cp = mapMoralis(
      [
        {
          symbol: 'ZP',
          decimals: 18,
          balance: '1000000000000000000',
          usd_price: 0,
          token_address: '0xzp',
        },
      ],
      eth,
    );
    expect(cp.tokens[0]?.priceUsd).toBeUndefined();
  });
});
