import type { Chain } from '../../config/chains';
import type { Env } from '../../config/env';
import type { WalletProvider } from './WalletProvider';
import { AlchemyProvider } from './alchemy/client';
import { CovalentProvider } from './covalent/client';
import { MoralisProvider } from './moralis/client';
import { UtxoProvider } from './utxo/client';
import { SolanaProvider } from './solana/client';
import { TronProvider } from './tron/client';

/** Chooses which provider(s) serve a chain, in preference order, for fail-over. */
export interface ProviderRouter {
  /** Providers that can serve this chain, best first. Empty if none is configured for it. */
  providersFor(chain: Chain): WalletProvider[];
  /** Ids of every configured provider (for diagnostics / "no provider" messaging). */
  readonly providerIds: string[];
}

/**
 * Global preference order. Alchemy first (accurate token/metadata on the chains it serves); Covalent
 * next (widest chain coverage, prices included); Moralis last (prices + spam flag, but it rejects
 * very large wallets, so it should not be the primary attempt).
 */
const PREFERENCE = ['alchemy', 'covalent', 'moralis', 'utxo', 'solana', 'tron'];

export function buildRouter(env: Env): ProviderRouter {
  const providers: WalletProvider[] = [];
  if (env.ALCHEMY_KEY) {
    providers.push(new AlchemyProvider(env.ALCHEMY_KEY));
  }
  if (env.COVALENT_KEY) {
    providers.push(new CovalentProvider(env.COVALENT_KEY));
  }
  if (env.MORALIS_KEY) {
    providers.push(new MoralisProvider(env.MORALIS_KEY));
  }
  // UTXO chains (BTC/LTC/DOGE/BCH) need no key (public explorers); Solana uses the Moralis key.
  providers.push(new UtxoProvider());
  if (env.MORALIS_KEY) {
    providers.push(new SolanaProvider(env.MORALIS_KEY));
  }
  // TRON is keyless via TronGrid's public endpoint; the optional key just lifts the rate limit.
  providers.push(new TronProvider(env.TRONGRID_KEY));
  providers.sort((a, b) => PREFERENCE.indexOf(a.id) - PREFERENCE.indexOf(b.id));

  return {
    providerIds: providers.map((p) => p.id),
    providersFor(chain: Chain): WalletProvider[] {
      return providers.filter((p) => p.supports(chain));
    },
  };
}
