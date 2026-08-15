import type { Chain } from '../../../config/chains';
import type { ChainPortfolio, DefiPosition } from '../../models/portfolio';
import type { WalletProvider } from '../WalletProvider';
import { httpJson } from '../../../util/http';
import { mapMoralis, type MoralisToken } from './mapper';
import { mapMoralisDefi, type MoralisDefiSummary } from './defi';

interface MoralisResponse {
  result?: MoralisToken[];
}

/**
 * Moralis provider. One REST call returns native + token balances with USD prices and a spam flag.
 * Note: Moralis rejects wallets with very large token counts (HTTP 400), so it is offered as an
 * alternate rather than the primary — the router falls through to another provider when it fails.
 */
export class MoralisProvider implements WalletProvider {
  readonly id = 'moralis';

  constructor(private readonly apiKey: string) {}

  supports(chain: Chain): boolean {
    return Boolean(chain.moralisChain);
  }

  async getBalances(address: string, chain: Chain): Promise<ChainPortfolio> {
    const url =
      `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens` +
      `?chain=${chain.moralisChain}&exclude_spam=true`;

    const res = await httpJson<MoralisResponse>(url, {
      headers: { 'X-API-Key': this.apiKey, accept: 'application/json' },
      timeoutMs: 15_000,
    });

    return mapMoralis(res.result ?? [], chain);
  }

  async getDefi(address: string, chain: Chain): Promise<DefiPosition[]> {
    const url =
      `https://deep-index.moralis.io/api/v2.2/wallets/${address}/defi/summary` +
      `?chain=${chain.moralisChain}`;

    const res = await httpJson<MoralisDefiSummary>(url, {
      headers: { 'X-API-Key': this.apiKey, accept: 'application/json' },
      timeoutMs: 15_000,
    });

    return mapMoralisDefi(res);
  }
}
