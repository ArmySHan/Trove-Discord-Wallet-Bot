import type { Chain } from '../../../config/chains';
import type { ChainPortfolio } from '../../models/portfolio';
import type { WalletProvider } from '../WalletProvider';
import { httpJson } from '../../../util/http';
import { mapCovalent, type CovalentItem } from './mapper';

interface CovalentResponse {
  data?: { items?: CovalentItem[] };
  error?: boolean;
  error_message?: string;
}

/**
 * Covalent / GoldRush provider. One REST call returns native + token balances *with* USD prices for
 * a chain, and Covalent covers far more chains than the others — so it is Trove's breadth/fallback
 * source. Prices that arrive here are kept; the aggregator only fills the gaps.
 */
export class CovalentProvider implements WalletProvider {
  readonly id = 'covalent';

  constructor(private readonly apiKey: string) {}

  supports(chain: Chain): boolean {
    return Boolean(chain.covalentChain);
  }

  async getBalances(address: string, chain: Chain): Promise<ChainPortfolio> {
    const url =
      `https://api.covalenthq.com/v1/${chain.covalentChain}/address/${address}/balances_v2/` +
      `?quote-currency=USD&nft=false`;

    const res = await httpJson<CovalentResponse>(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      timeoutMs: 15_000,
    });

    if (res.error) {
      throw new Error(`Covalent: ${res.error_message ?? 'request failed'}`);
    }
    return mapCovalent(res.data?.items ?? [], chain);
  }
}
