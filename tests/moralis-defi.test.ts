import { describe, expect, it } from 'vitest';
import { mapMoralisDefi, type MoralisDefiSummary } from '../src/core/providers/moralis/defi';

describe('mapMoralisDefi', () => {
  it('maps protocols by value, infers a type, and drops zero-value protocols', () => {
    const summary: MoralisDefiSummary = {
      total_usd_value: 1570,
      protocols: [
        { protocol_name: 'Uniswap v3', total_usd_value: 160, positions: 3 },
        { protocol_name: 'Aave v2', total_usd_value: 1410, positions: 1 },
        { protocol_name: 'Empty Protocol', total_usd_value: 0, positions: 0 },
      ],
    };

    const positions = mapMoralisDefi(summary);

    expect(positions).toHaveLength(2); // zero-value protocol dropped
    expect(positions[0]?.protocol).toBe('Aave v2'); // highest value first
    expect(positions[0]?.valueUsd).toBe(1410);
    expect(positions[0]?.type).toBe('lending');
    expect(positions[1]?.type).toBe('lp'); // Uniswap -> liquidity pool
  });

  it('returns an empty list when there are no protocols', () => {
    expect(mapMoralisDefi({})).toEqual([]);
  });
});
