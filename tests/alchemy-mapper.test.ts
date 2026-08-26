import { describe, expect, it } from 'vitest';
import { mapNative, mapTokens } from '../src/core/providers/alchemy/mapper';
import { CHAINS } from '../src/config/chains';

const eth = CHAINS.ethereum!;

describe('alchemy mapper', () => {
  it('maps native balance from hex', () => {
    const native = mapNative('0x1bc16d674ec80000', eth); // 2e18 wei = 2 ETH
    expect(native.symbol).toBe('ETH');
    expect(native.amount).toBeCloseTo(2);
    expect(native.isNative).toBe(true);
  });

  it('keeps good tokens and drops zero-balance / metadata-less junk', () => {
    const balances = [
      { contractAddress: '0xAAA', tokenBalance: '0x0' }, // zero -> dropped
      { contractAddress: '0xBBB', tokenBalance: '0xde0b6b3a7640000' }, // 1e18
      { contractAddress: '0xCCC', tokenBalance: '0xf4240' }, // 1e6 but no metadata -> dropped
    ];
    const metadata = [
      { name: 'Zero', symbol: 'ZERO', decimals: 18 },
      { name: 'Good Token', symbol: 'GOOD', decimals: 18, logo: 'http://logo' },
      { name: null, symbol: null, decimals: 6 },
    ];

    const tokens = mapTokens(balances, metadata);

    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.symbol).toBe('GOOD');
    expect(tokens[0]?.amount).toBeCloseTo(1);
    expect(tokens[0]?.contract).toBe('0xbbb');
  });
});
