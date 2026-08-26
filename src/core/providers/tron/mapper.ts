import type { Chain } from '../../../config/chains';
import type { ChainPortfolio, DefiPosition, TokenBalance } from '../../models/portfolio';
import type { TokenMeta } from '../../verify/tokenlist';
import { toHumanUnits } from '../../../util/format';

/** TronGrid `GET /v1/accounts/{address}` response (only the fields Trove uses). */
export interface TronAccountResponse {
  data?: Array<{
    balance?: number; // liquid TRX, in SUN
    trc20?: Array<Record<string, string>>; // [{ "<contractBase58>": "<rawBalance>" }, ...]
    frozenV2?: Array<{ type?: string; amount?: number }>; // staked TRX (Stake 2.0), in SUN
  }>;
}

export interface TronMapOptions {
  /** Decimals + symbol for a TRC-20 contract (from the CoinGecko 'tron' list); undefined = not listed. */
  getMeta: (contract: string) => TokenMeta | undefined;
  /** TRX price in USD, used to value the staked position; if undefined, staking is omitted. */
  trxPriceUsd?: number;
}

const MAX_TOKENS = 150;
const TRX_DECIMALS = 6;

/**
 * Maps a TronGrid account into Trove's model. TRC-20 balances arrive as contract→raw only, so
 * decimals/symbol are enriched from the CoinGecko 'tron' list; unlisted contracts (Tron is heavily
 * spammed) are dropped. Staked (frozenV2) TRX is surfaced as a separate staking DeFi position.
 */
export function mapTron(
  res: TronAccountResponse,
  chain: Chain,
  opts: TronMapOptions,
): ChainPortfolio {
  const account = res.data?.[0]; // unactivated account -> data:[] -> undefined -> zero balance
  const liquidSun = toBig(account?.balance);

  const native: TokenBalance = {
    symbol: 'TRX',
    name: 'TRON',
    amount: toHumanUnits(liquidSun, TRX_DECIMALS),
    decimals: TRX_DECIMALS,
    isNative: true,
  };

  const tokens: TokenBalance[] = [];
  for (const entry of account?.trc20 ?? []) {
    for (const [contract, raw] of Object.entries(entry)) {
      const meta = opts.getMeta(contract);
      if (!meta) {
        continue; // unlisted -> spam, drop
      }
      const amount = safeAmount(raw, meta.decimals);
      if (amount <= 0) {
        continue;
      }
      // Base58 contract kept verbatim (case-sensitive) — never lowercased.
      tokens.push({
        symbol: meta.symbol,
        name: meta.symbol,
        contract,
        amount,
        decimals: meta.decimals,
      });
    }
  }
  tokens.sort((a, b) => b.amount - a.amount); // rough pre-price order; aggregator re-sorts by value

  const stakedSun = (account?.frozenV2 ?? []).reduce((sum, f) => sum + toBig(f.amount), 0n);
  const defi: DefiPosition[] = [];
  if (stakedSun > 0n && opts.trxPriceUsd !== undefined) {
    const stakedTrx = toHumanUnits(stakedSun, TRX_DECIMALS);
    defi.push({
      protocol: 'TRON Staking',
      type: 'staking',
      items: [
        {
          symbol: 'TRX',
          name: 'Staked TRX',
          amount: stakedTrx,
          decimals: TRX_DECIMALS,
          isNative: true,
        },
      ],
      valueUsd: stakedTrx * opts.trxPriceUsd,
    });
  }

  return {
    chainId: chain.id,
    name: chain.name,
    native,
    tokens: tokens.slice(0, MAX_TOKENS),
    defi,
    nfts: { count: 0 },
    totalUsd: 0,
  };
}

function toBig(value: number | undefined): bigint {
  return BigInt(Math.trunc(value ?? 0));
}

function safeAmount(raw: string, decimals: number): number {
  try {
    return toHumanUnits(BigInt(raw), decimals);
  } catch {
    return 0;
  }
}
