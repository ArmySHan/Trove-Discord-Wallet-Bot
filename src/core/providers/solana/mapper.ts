import type { Chain } from '../../../config/chains';
import type { ChainPortfolio, TokenBalance } from '../../models/portfolio';

/** Shape of Moralis's Solana `/account/mainnet/{address}/portfolio` response (fields Trove uses). */
export interface SolanaPortfolioResponse {
  nativeBalance?: { solana?: string };
  tokens?: Array<{
    mint?: string;
    amount?: string; // already in human units
    decimals?: number;
    name?: string;
    symbol?: string;
    possibleSpam?: boolean;
    logo?: string | null;
  }>;
}

const MAX_TOKENS = 150;

export function mapSolana(data: SolanaPortfolioResponse, chain: Chain): ChainPortfolio {
  const native: TokenBalance = {
    symbol: 'SOL',
    name: 'Solana',
    amount: num(data.nativeBalance?.solana),
    decimals: 9,
    isNative: true,
  };

  const tokens: TokenBalance[] = (data.tokens ?? [])
    .filter((t) => t.mint && num(t.amount) > 0)
    .map((t) => ({
      symbol: t.symbol || '?',
      name: t.name ?? '',
      // SPL mint addresses are case-sensitive base58 — kept verbatim (not lowercased).
      contract: t.mint as string,
      amount: num(t.amount),
      decimals: t.decimals ?? 0,
      logo: t.logo ?? undefined,
      isSpam: t.possibleSpam === true ? true : undefined,
    }));
  // Sort before capping so the cap drops the smallest holdings, not an arbitrary tail of the response.
  tokens.sort((a, b) => b.amount - a.amount);

  return {
    chainId: chain.id,
    name: chain.name,
    native,
    tokens: tokens.slice(0, MAX_TOKENS),
    defi: [],
    nfts: { count: 0 },
    totalUsd: 0,
  };
}

function num(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
