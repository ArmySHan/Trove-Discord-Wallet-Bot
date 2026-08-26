import type { Chain } from '../../../config/chains';
import type { ChainPortfolio, TokenBalance } from '../../models/portfolio';
import { toHumanUnits } from '../../../util/format';

/** A token entry from Moralis's `/wallets/{address}/tokens` response (only the fields Trove uses). */
export interface MoralisToken {
  token_address?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: string; // raw integer string
  usd_price?: number | null;
  native_token?: boolean;
  possible_spam?: boolean;
  logo?: string | null;
}

const MAX_TOKENS = 150;

export function mapMoralis(items: MoralisToken[], chain: Chain): ChainPortfolio {
  let native: TokenBalance = {
    symbol: chain.nativeSymbol,
    name: chain.name,
    amount: 0,
    decimals: chain.nativeDecimals,
    isNative: true,
  };
  const tokens: TokenBalance[] = [];

  for (const item of items) {
    const decimals = item.decimals ?? 18;
    const amount = safeAmount(item.balance, decimals);

    if (item.native_token === true) {
      native = {
        symbol: item.symbol ?? chain.nativeSymbol,
        name: chain.name,
        amount,
        decimals,
        isNative: true,
        priceUsd: positivePrice(item.usd_price),
      };
      continue;
    }

    if (amount <= 0 || !item.token_address) {
      continue;
    }

    tokens.push({
      symbol: item.symbol ?? '?',
      name: item.name ?? '',
      contract: item.token_address,
      amount,
      decimals,
      priceUsd: positivePrice(item.usd_price),
      logo: item.logo ?? undefined,
      // Moralis ships an explicit spam flag; honor it so flagged tokens stay out of the headline.
      isSpam: item.possible_spam === true ? true : undefined,
    });
  }

  tokens.sort((a, b) => value(b) - value(a));
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

function value(t: TokenBalance): number {
  return (t.priceUsd ?? 0) * t.amount;
}

/** Treat null/0 as "no price" so the aggregator falls back to DefiLlama rather than locking a $0. */
function positivePrice(p: number | null | undefined): number | undefined {
  return typeof p === 'number' && p > 0 ? p : undefined;
}

function safeAmount(raw: string | undefined, decimals: number): number {
  if (!raw) {
    return 0;
  }
  try {
    return toHumanUnits(BigInt(raw), decimals);
  } catch {
    return 0;
  }
}
