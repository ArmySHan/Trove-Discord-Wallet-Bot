import { describe, expect, it } from 'vitest';
import { mapCovalent, type CovalentItem } from '../src/core/providers/covalent/mapper';
import { getChain } from '../src/config/chains';

const eth = getChain('ethereum')!;

describe('mapCovalent', () => {
  it('maps native and tokens with inline prices, skips NFTs and zero balances', () => {
    const items: CovalentItem[] = [
      {
        contract_decimals: 18,
        contract_name: 'Ether',
        contract_ticker_symbol: 'ETH',
        contract_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        balance: '2000000000000000000',
        quote_rate: 2000,
        native_token: true,
        type: 'cryptocurrency',
      },
      {
        contract_decimals: 6,
        contract_name: 'USD Coin',
        contract_ticker_symbol: 'USDC',
        contract_address: '0xusdc',
        balance: '100000000',
        quote_rate: 1,
        type: 'cryptocurrency',
      },
      {
        contract_decimals: 0,
        contract_name: 'An NFT',
        contract_ticker_symbol: 'NFT',
        contract_address: '0xnft',
        balance: '1',
        quote_rate: null,
        type: 'nft',
      },
      {
        contract_decimals: 18,
        contract_name: 'Zero',
        contract_ticker_symbol: 'ZERO',
        contract_address: '0xzero',
        balance: '0',
        quote_rate: 5,
        type: 'cryptocurrency',
      },
    ];

    const cp = mapCovalent(items, eth);

    expect(cp.native.symbol).toBe('ETH');
    expect(cp.native.amount).toBeCloseTo(2);
    expect(cp.native.priceUsd).toBe(2000);

    expect(cp.tokens).toHaveLength(1);
    expect(cp.tokens[0]?.symbol).toBe('USDC');
    expect(cp.tokens[0]?.amount).toBeCloseTo(100);
    expect(cp.tokens[0]?.priceUsd).toBe(1);
  });

  it('treats a 0 price as unpriced so the aggregator can fall back to DefiLlama', () => {
    const cp = mapCovalent(
      [
        {
          contract_decimals: 18,
          contract_name: 'Zero Priced',
          contract_ticker_symbol: 'ZP',
          contract_address: '0xzp',
          balance: '1000000000000000000',
          quote_rate: 0,
          type: 'cryptocurrency',
        },
      ],
      eth,
    );
    expect(cp.tokens[0]?.priceUsd).toBeUndefined();
  });
});
