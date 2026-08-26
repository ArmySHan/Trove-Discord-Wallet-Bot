import { describe, expect, it } from 'vitest';
import { mapSolana, type SolanaPortfolioResponse } from '../src/core/providers/solana/mapper';
import { getChain } from '../src/config/chains';

const solana = getChain('solana')!;

describe('mapSolana', () => {
  it('maps native SOL + SPL tokens, preserves mint case, flags spam, drops zero balances', () => {
    const data: SolanaPortfolioResponse = {
      nativeBalance: { solana: '12.5' },
      tokens: [
        {
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
          name: 'USD Coin',
          amount: '100',
          decimals: 6,
        },
        { mint: 'SpaMMintAbc123', symbol: 'SCAM', amount: '999', decimals: 0, possibleSpam: true },
        { mint: 'ZeroMint', symbol: 'ZERO', amount: '0', decimals: 0 },
      ],
    };

    const cp = mapSolana(data, solana);

    expect(cp.native.symbol).toBe('SOL');
    expect(cp.native.amount).toBeCloseTo(12.5);
    expect(cp.tokens).toHaveLength(2); // zero-balance dropped

    const usdc = cp.tokens.find((t) => t.symbol === 'USDC');
    expect(usdc?.amount).toBe(100);
    // base58 mint kept verbatim (case-sensitive) — not lowercased like an EVM address.
    expect(usdc?.contract).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    expect(cp.tokens.find((t) => t.symbol === 'SCAM')?.isSpam).toBe(true);
  });
});
