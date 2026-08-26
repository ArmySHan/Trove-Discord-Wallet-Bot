import type { Chain } from '../../../config/chains';
import type { ChainPortfolio } from '../../models/portfolio';
import type { WalletProvider } from '../WalletProvider';
import { httpJson } from '../../../util/http';
import { tokenRegistry } from '../../verify/tokenlist';
import { defiLlamaPriceClient, nativeKey } from '../../prices/prices';
import { mapTron, type TronAccountResponse } from './mapper';

/**
 * TRON provider via TronGrid's public `/v1/accounts` endpoint (keyless; an optional TRON-PRO-API-KEY
 * lifts the rate limit). One call returns liquid TRX, all TRC-20 balances (contract→raw) and staked
 * TRX (`frozenV2`). TRC-20 decimals/symbols — which TronGrid omits — are enriched from the CoinGecko
 * 'tron' token list (also used for verification); prices are filled by the aggregator via DefiLlama.
 */
export class TronProvider implements WalletProvider {
  readonly id = 'tron';

  constructor(private readonly apiKey?: string) {}

  supports(chain: Chain): boolean {
    return chain.ecosystem === 'tron';
  }

  async getBalances(address: string, chain: Chain): Promise<ChainPortfolio> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (this.apiKey) {
      headers['TRON-PRO-API-KEY'] = this.apiKey;
    }

    const res = await httpJson<TronAccountResponse>(
      `https://api.trongrid.io/v1/accounts/${address}`,
      { headers, timeoutMs: 12_000 },
    );

    // TRC-20 metadata (decimals/symbol) comes from the CoinGecko 'tron' list shared with verification.
    // Without it, every TRC-20 would be dropped as "unlisted"; fail loud so the aggregator marks the
    // chain partial instead of silently rendering a TRX-only wallet.
    await tokenRegistry.ensureLoaded([chain.coinGeckoPlatform]);
    if (!tokenRegistry.isLoaded(chain.coinGeckoPlatform)) {
      throw new Error(
        `TRON token list unavailable (${chain.coinGeckoPlatform}); cannot resolve TRC-20 metadata`,
      );
    }

    // Value staked TRX with the TRX price (liquid TRX is priced later by the aggregator).
    let trxPriceUsd: number | undefined;
    if ((res.data?.[0]?.frozenV2?.length ?? 0) > 0) {
      const key = nativeKey(chain.nativeCoinGeckoId);
      const prices = await defiLlamaPriceClient
        .fetchPrices([key])
        .catch(() => new Map<string, number>());
      trxPriceUsd = prices.get(key);
    }

    return mapTron(res, chain, {
      getMeta: (contract) => tokenRegistry.getMetadata(chain.coinGeckoPlatform, contract),
      trxPriceUsd,
    });
  }
}
