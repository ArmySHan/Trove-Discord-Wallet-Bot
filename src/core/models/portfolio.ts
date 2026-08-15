/**
 * Normalized portfolio model. Every provider maps its raw response into these shapes, so the
 * aggregator and the Discord layer never see vendor-specific data.
 */

export interface TokenBalance {
  symbol: string;
  name: string;
  /** Contract address; undefined for the chain's native coin. */
  contract?: string;
  /** Balance in human units (e.g. 1.5 ETH). */
  amount: number;
  decimals: number;
  priceUsd?: number;
  valueUsd?: number;
  logo?: string;
  isNative?: boolean;
  /** Flagged by a provider/heuristic as spam or scam; excluded from totals. */
  isSpam?: boolean;
  /**
   * True if the token appears in a reputable token list (e.g. CoinGecko's). Native coins are always
   * verified. Unverified tokens may still be priced, but they are kept out of the headline total so
   * that airdrop spam with a nominal price cannot inflate it. Undefined until classification runs.
   */
  verified?: boolean;
}

export type DefiPositionType = 'lending' | 'borrow' | 'lp' | 'staking' | 'farm' | 'vault' | 'other';

export interface DefiPosition {
  protocol: string;
  type: DefiPositionType;
  items: TokenBalance[];
  valueUsd: number;
}

export interface NftSummary {
  count: number;
}

export interface ChainPortfolio {
  chainId: string;
  name: string;
  native: TokenBalance;
  tokens: TokenBalance[];
  defi: DefiPosition[];
  nfts: NftSummary;
  /** Headline value: native + verified, priced tokens only. */
  totalUsd: number;
  /** Value of priced-but-unverified tokens; disclosed separately, never in the headline. */
  unverifiedUsd?: number;
}

export interface WalletPortfolio {
  address: string;
  ens?: string;
  /** Headline value across all chains: native + verified, priced tokens only. */
  totalUsd: number;
  /** Total value of priced-but-unverified tokens across all chains; disclosed, not in the headline. */
  unverifiedUsd?: number;
  /** Estimated value of DeFi positions across all chains; disclosed separately as an estimate. */
  defiUsd?: number;
  chains: ChainPortfolio[];
  fetchedAt: number;
  /** True if one or more chains/providers failed and the result is incomplete. */
  partial: boolean;
  /** Provider ids that contributed to this result. */
  sources: string[];
}
