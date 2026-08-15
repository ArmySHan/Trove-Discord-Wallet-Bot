import type { Chain } from '../../../config/chains';
import type { ChainPortfolio, TokenBalance } from '../../models/portfolio';
import { toHumanUnits } from '../../../util/format';

/** A single entry from Covalent's `balances_v2` response (only the fields Trove uses). */
export interface CovalentItem {
  contract_decimals: number | null;
  contract_name: string | null;
  contract_ticker_symbol: string | null;
  contract_address: string | null;
  logo_url?: string | null;
  type?: string;
  native_token?: boolean;
  balance: string | null;
  /** USD price per token (Covalent-supplied). */
  quote_rate: number | null;
}

/** Covalent returns thousands of entries (lots of spam); cap to bound downstream work. */
const MAX_TOKENS = 200;
const NATIVE_SENTINEL = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export function mapCovalent(items: CovalentItem[], chain: Chain): ChainPortfolio {
  let native: TokenBalance = {
    symbol: chain.nativeSymbol,
    name: chain.name,
    amount: 0,
    decimals: chain.nativeDecimals,
    isNative: true,
  };
  const tokens: TokenBalance[] = [];

  for (const item of items) {
    const decimals = item.contract_decimals ?? 18;
    const amount = safeAmount(item.balance, decimals);
    const isNative =
      item.native_token === true || item.contract_address?.toLowerCase() === NATIVE_SENTINEL;

    if (isNative) {
      native = {
        symbol: item.contract_ticker_symbol ?? chain.nativeSymbol,
        name: chain.name,
        amount,
        decimals,
        isNative: true,
        priceUsd: positivePrice(item.quote_rate),
      };
      continue;
    }

    if (item.type === 'nft' || amount <= 0 || !item.contract_address) {
      continue;
    }

    tokens.push({
      symbol: item.contract_ticker_symbol ?? '?',
      name: item.contract_name ?? '',
      contract: item.contract_address,
      amount,
      decimals,
      priceUsd: positivePrice(item.quote_rate),
      logo: item.logo_url ?? undefined,
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

function safeAmount(raw: string | null, decimals: number): number {
  if (!raw) {
    return 0;
  }
  try {
    return toHumanUnits(BigInt(raw), decimals);
  } catch {
    return 0;
  }
}
