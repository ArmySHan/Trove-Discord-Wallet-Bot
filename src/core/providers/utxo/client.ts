import type { Chain, UtxoSource } from '../../../config/chains';
import type { ChainPortfolio } from '../../models/portfolio';
import type { WalletProvider } from '../WalletProvider';
import { httpJson } from '../../../util/http';

/**
 * UTXO provider for Bitcoin, Litecoin, Dogecoin and Bitcoin Cash. Each chain points at a keyless
 * public explorer (`chain.utxo`); this provider reads the confirmed native balance and normalizes it
 * to human units. There is no token model for these chains. The native price is filled by the
 * aggregator via the chain's CoinGecko id.
 */
export class UtxoProvider implements WalletProvider {
  readonly id = 'utxo';

  supports(chain: Chain): boolean {
    return Boolean(chain.utxo);
  }

  async getBalances(address: string, chain: Chain): Promise<ChainPortfolio> {
    const smallestUnits = await fetchBalance(chain.utxo as UtxoSource, address);
    const amount = Number(smallestUnits) / 10 ** chain.nativeDecimals;

    return {
      chainId: chain.id,
      name: chain.name,
      native: {
        symbol: chain.nativeSymbol,
        name: chain.name,
        amount,
        decimals: chain.nativeDecimals,
        isNative: true,
      },
      tokens: [],
      defi: [],
      nfts: { count: 0 },
      totalUsd: 0,
    };
  }
}

/** Returns the confirmed balance in the chain's smallest unit (satoshi/litoshi/koinu). */
async function fetchBalance(source: UtxoSource, address: string): Promise<bigint> {
  switch (source.kind) {
    case 'esplora': {
      const data = await httpJson<{
        chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
      }>(`${source.baseUrl}/api/address/${encodeURIComponent(address)}`, { timeoutMs: 12_000 });
      const funded = BigInt(data.chain_stats?.funded_txo_sum ?? 0);
      const spent = BigInt(data.chain_stats?.spent_txo_sum ?? 0);
      return funded - spent;
    }
    case 'blockcypher': {
      const data = await httpJson<{ final_balance?: number }>(
        `https://api.blockcypher.com/v1/${source.coin}/main/addrs/${encodeURIComponent(address)}/balance`,
        { timeoutMs: 12_000 },
      );
      return BigInt(Math.round(data.final_balance ?? 0));
    }
    case 'haskoin': {
      // Haskoin accepts a cashaddr (with or without the "bitcoincash:" prefix) or a legacy address.
      const data = await httpJson<{ confirmed?: number }>(
        `https://api.haskoin.com/${source.net}/address/${encodeURIComponent(address)}/balance`,
        { timeoutMs: 12_000 },
      );
      return BigInt(Math.round(data.confirmed ?? 0));
    }
  }
}
