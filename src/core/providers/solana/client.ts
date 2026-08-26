import type { Chain } from '../../../config/chains';
import type { ChainPortfolio } from '../../models/portfolio';
import type { WalletProvider } from '../WalletProvider';
import { httpJson } from '../../../util/http';
import { mapSolana, type SolanaPortfolioResponse } from './mapper';

/**
 * Solana provider via Moralis's Solana gateway. Returns native SOL + SPL token balances; prices are
 * left to the aggregator (DefiLlama `solana:<mint>`), which also handles SPL verification.
 */
export class SolanaProvider implements WalletProvider {
  readonly id = 'solana';

  constructor(private readonly apiKey: string) {}

  supports(chain: Chain): boolean {
    return chain.ecosystem === 'solana';
  }

  async getBalances(address: string, chain: Chain): Promise<ChainPortfolio> {
    const data = await httpJson<SolanaPortfolioResponse>(
      `https://solana-gateway.moralis.io/account/mainnet/${address}/portfolio`,
      {
        headers: { 'X-API-Key': this.apiKey, accept: 'application/json' },
        timeoutMs: 15_000,
      },
    );

    return mapSolana(data, chain);
  }
}
