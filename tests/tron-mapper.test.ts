import { describe, expect, it } from 'vitest';
import { mapTron, type TronAccountResponse } from '../src/core/providers/tron/mapper';
import { getChain } from '../src/config/chains';
import type { TokenMeta } from '../src/core/verify/tokenlist';

const tron = getChain('tron')!;
const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const meta: Record<string, TokenMeta> = { [USDT]: { symbol: 'USDT', decimals: 6 } };
const getMeta = (c: string): TokenMeta | undefined => meta[c];

describe('mapTron', () => {
  it('maps liquid TRX, enriches listed TRC-20, drops unlisted spam, and stakes frozenV2', () => {
    const res: TronAccountResponse = {
      data: [
        {
          balance: 5_000000, // 5 TRX, in SUN
          trc20: [
            { [USDT]: '1500000000' }, // 1500 USDT (6 decimals)
            { TSpamContractXXXXXXXXXXXXXXXXXXXXX: '99999999999999999999' }, // unlisted -> dropped
          ],
          frozenV2: [{ type: 'ENERGY', amount: 10_000000 }], // 10 TRX staked
        },
      ],
    };

    const cp = mapTron(res, tron, { getMeta, trxPriceUsd: 0.3 });

    expect(cp.native.symbol).toBe('TRX');
    expect(cp.native.amount).toBeCloseTo(5);

    expect(cp.tokens).toHaveLength(1); // spam dropped (not in the list)
    expect(cp.tokens[0]?.symbol).toBe('USDT');
    expect(cp.tokens[0]?.amount).toBeCloseTo(1500);
    expect(cp.tokens[0]?.contract).toBe(USDT); // base58 kept verbatim (case-sensitive)

    expect(cp.defi).toHaveLength(1);
    expect(cp.defi[0]?.type).toBe('staking');
    expect(cp.defi[0]?.valueUsd).toBeCloseTo(3); // 10 TRX * $0.30
  });

  it('treats an unactivated account (data: []) as a zero balance, not an error', () => {
    const cp = mapTron({ data: [] }, tron, { getMeta });
    expect(cp.native.amount).toBe(0);
    expect(cp.tokens).toEqual([]);
    expect(cp.defi).toEqual([]);
  });
});
