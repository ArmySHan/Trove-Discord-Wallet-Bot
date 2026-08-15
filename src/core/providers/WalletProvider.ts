import type { Chain } from '../../config/chains';
import type { ChainPortfolio, DefiPosition } from '../models/portfolio';

/**
 * A wallet-data provider. Implementations return raw **balances** for one chain (native + tokens);
 * prices and totals are filled by the price service and aggregator, keeping providers focused and
 * easy to swap. Some providers also expose DeFi positions via the optional `getDefi`.
 */
export interface WalletProvider {
  /** Stable id, e.g. 'alchemy'. */
  readonly id: string;

  /** Whether this provider can serve the given chain. */
  supports(chain: Chain): boolean;

  /**
   * Fetch native + token balances for one address on one chain. `priceUsd`/`valueUsd`/`totalUsd`
   * are left unset (filled downstream). Throws on failure; the aggregator marks the result partial.
   */
  getBalances(address: string, chain: Chain): Promise<ChainPortfolio>;

  /**
   * Optional: fetch DeFi positions (LPs, lending, staking…) for one address on one chain. Providers
   * that cannot do this omit the method; the aggregator treats DeFi as best-effort and fail-soft.
   */
  getDefi?(address: string, chain: Chain): Promise<DefiPosition[]>;
}
