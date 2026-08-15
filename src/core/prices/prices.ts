import { httpJson } from '../../util/http';
import { logger } from '../../util/logger';
import { normalizeContract } from '../../util/format';

const LLAMA_BASE = 'https://coins.llama.fi/prices/current';
// DefiLlama accepts many coins per request; we chunk to keep URLs well under any length limit.
const MAX_KEYS_PER_CALL = 100;

/**
 * A USD price source, abstracted so the aggregator can be tested without the network.
 *
 * Keys are DefiLlama coin identifiers:
 *   - tokens:       `${chain}:${contract}`   e.g. 'ethereum:0xa0b8...' or 'solana:EPjF...'
 *   - native coins: `coingecko:${id}`        e.g. 'coingecko:ethereum'
 *
 * The chain prefix is lowercased; the address part is normalized per ecosystem (EVM lowercased,
 * Solana base58 left intact). DefiLlama is used because its `prices/current` endpoint batches
 * hundreds of coins across many chains in a single keyless request — unlike CoinGecko's free
 * token-price endpoint, which now caps requests at one contract address each.
 */
export interface PriceClient {
  fetchPrices(keys: string[]): Promise<Map<string, number>>;
}

interface LlamaResponse {
  coins?: Record<string, { price?: number }>;
}

async function fetchPrices(keys: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(keys.map(normalizeKey))].filter(Boolean);
  const out = new Map<string, number>();

  for (const group of chunk(unique, MAX_KEYS_PER_CALL)) {
    const url = `${LLAMA_BASE}/${group.join(',')}`;
    try {
      const data = await httpJson<LlamaResponse>(url);
      for (const [key, value] of Object.entries(data.coins ?? {})) {
        if (typeof value.price === 'number') {
          out.set(normalizeKey(key), value.price);
        }
      }
    } catch (err) {
      // Fail soft: a bad chunk leaves those assets unpriced rather than failing the whole wallet.
      logger.warn({ err }, 'Price fetch failed');
    }
  }

  return out;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Lowercases the `chain:` prefix and normalizes the address part for the ecosystem. */
function normalizeKey(key: string): string {
  const sep = key.indexOf(':');
  if (sep < 0) {
    return key.toLowerCase();
  }
  return `${key.slice(0, sep).toLowerCase()}:${normalizeContract(key.slice(sep + 1))}`;
}

/** DefiLlama key for a native coin (priced via its CoinGecko id). */
export function nativeKey(coinGeckoId: string): string {
  return `coingecko:${coinGeckoId.toLowerCase()}`;
}

/** DefiLlama key for a token, by chain slug and contract address. */
export function tokenKey(defiLlamaChain: string, contract: string): string {
  return `${defiLlamaChain.toLowerCase()}:${normalizeContract(contract)}`;
}

export const defiLlamaPriceClient: PriceClient = { fetchPrices };
