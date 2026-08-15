import type { Chain } from '../../../config/chains';
import type { TokenBalance } from '../../models/portfolio';
import { toHumanUnits } from '../../../util/format';

/** Raw shapes from Alchemy's enhanced JSON-RPC (the parts we use). */
export interface RawTokenBalance {
  contractAddress: string;
  tokenBalance: string | null;
}

export interface RawTokenMetadata {
  name?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  logo?: string | null;
}

/** Map an `eth_getBalance` hex result to the chain's native TokenBalance. */
export function mapNative(balanceHex: string, chain: Chain): TokenBalance {
  return {
    symbol: chain.nativeSymbol,
    name: chain.name,
    amount: toHumanUnits(safeBigInt(balanceHex), chain.nativeDecimals),
    decimals: chain.nativeDecimals,
    isNative: true,
  };
}

/**
 * Map raw ERC-20 balances + their metadata to TokenBalances. Zero balances and tokens with no
 * usable metadata (usually junk) are dropped. Prices are filled later by the aggregator.
 */
export function mapTokens(
  balances: RawTokenBalance[],
  metadata: ReadonlyArray<RawTokenMetadata | undefined>,
): TokenBalance[] {
  const out: TokenBalance[] = [];

  for (let i = 0; i < balances.length; i++) {
    const balance = balances[i];
    if (!balance) {
      continue;
    }

    const raw = safeBigInt(balance.tokenBalance);
    if (raw <= 0n) {
      continue;
    }

    const meta = metadata[i] ?? {};
    const decimals = typeof meta.decimals === 'number' ? meta.decimals : 18;
    const symbol = (meta.symbol ?? '').trim();
    const name = (meta.name ?? '').trim();
    if (!symbol || !name) {
      continue;
    }

    const amount = toHumanUnits(raw, decimals);
    if (amount <= 0) {
      continue;
    }

    out.push({
      symbol,
      name,
      contract: balance.contractAddress.toLowerCase(),
      amount,
      decimals,
      logo: meta.logo ?? undefined,
    });
  }

  return out;
}

function safeBigInt(hex: string | null | undefined): bigint {
  if (!hex || hex === '0x') {
    return 0n;
  }
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}
