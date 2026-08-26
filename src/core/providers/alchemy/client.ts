import type { Chain } from '../../../config/chains';
import type { ChainPortfolio } from '../../models/portfolio';
import type { WalletProvider } from '../WalletProvider';
import { httpJson } from '../../../util/http';
import { mapNative, mapTokens, type RawTokenBalance, type RawTokenMetadata } from './mapper';

/** Cap tokens per chain to bound metadata/price fan-out and filter spam-heavy wallets. */
const MAX_TOKENS = 60;

/**
 * Alchemy provider using the enhanced JSON-RPC endpoints (stable): `eth_getBalance` for native,
 * `alchemy_getTokenBalances` for ERC-20s, and a batched `alchemy_getTokenMetadata`. Prices are not
 * fetched here — the aggregator fills them.
 */
export class AlchemyProvider implements WalletProvider {
  readonly id = 'alchemy';

  constructor(private readonly apiKey: string) {}

  supports(chain: Chain): boolean {
    return Boolean(chain.alchemyNetwork);
  }

  async getBalances(address: string, chain: Chain): Promise<ChainPortfolio> {
    const url = `https://${chain.alchemyNetwork}.g.alchemy.com/v2/${this.apiKey}`;

    const [nativeHex, balances] = await Promise.all([
      this.rpc<string>(url, 'eth_getBalance', [address, 'latest']),
      this.rpc<{ tokenBalances: RawTokenBalance[] }>(url, 'alchemy_getTokenBalances', [
        address,
        'erc20',
      ]),
    ]);

    const nonZero = (balances.tokenBalances ?? [])
      .filter((t) => isPositive(t.tokenBalance))
      .slice(0, MAX_TOKENS);

    const metadata = nonZero.length
      ? await this.rpcBatch<RawTokenMetadata>(
          url,
          nonZero.map((t) => ({ method: 'alchemy_getTokenMetadata', params: [t.contractAddress] })),
        )
      : [];

    return {
      chainId: chain.id,
      name: chain.name,
      native: mapNative(nativeHex, chain),
      tokens: mapTokens(nonZero, metadata),
      defi: [],
      nfts: { count: 0 },
      totalUsd: 0,
    };
  }

  private async rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
    const res = await httpJson<{ result?: T; error?: { message: string } }>(url, {
      method: 'POST',
      body: { jsonrpc: '2.0', id: 1, method, params },
    });
    if (res.error) {
      throw new Error(`Alchemy ${method}: ${res.error.message}`);
    }
    return res.result as T;
  }

  private async rpcBatch<T>(
    url: string,
    calls: { method: string; params: unknown[] }[],
  ): Promise<(T | undefined)[]> {
    const body = calls.map((c, i) => ({
      jsonrpc: '2.0',
      id: i,
      method: c.method,
      params: c.params,
    }));
    const res = await httpJson<{ id: number; result?: T }[]>(url, { method: 'POST', body });
    const byId = new Map(res.map((r) => [r.id, r.result]));
    return calls.map((_, i) => byId.get(i));
  }
}

function isPositive(hex: string | null): boolean {
  if (!hex || hex === '0x') {
    return false;
  }
  try {
    return BigInt(hex) > 0n;
  } catch {
    return false;
  }
}
