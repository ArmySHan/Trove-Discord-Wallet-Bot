/**
 * Chain registry — the single source of truth for which chains Trove supports and the
 * vendor-specific identifiers needed to query them. Adding an EVM chain that providers already
 * cover is a one-entry change here. A provider serves a chain only if the chain carries that
 * provider's slug, so coverage is data-driven (see each provider's `supports()`).
 */

/** How the UTXO provider reads a chain's native balance (one keyless public explorer each). */
export type UtxoSource =
  | { kind: 'esplora'; baseUrl: string } // mempool.space-style: {baseUrl}/api/address/{addr}
  | { kind: 'blockcypher'; coin: string } // api.blockcypher.com/v1/{coin}/main/addrs/{addr}/balance
  | { kind: 'haskoin'; net: string }; // api.haskoin.com/{net}/address/{addr}/balance

export interface Chain {
  /** Trove's stable id (used in config and commands). */
  id: string;
  name: string;
  /** Address ecosystem; defaults to EVM when omitted. Drives which provider serves the chain. */
  ecosystem?: 'evm' | 'bitcoin' | 'litecoin' | 'dogecoin' | 'bitcoin-cash' | 'solana' | 'tron';
  nativeSymbol: string;
  nativeDecimals: number;
  /** CoinGecko id for the native coin's price (e.g. 'ethereum'). */
  nativeCoinGeckoId: string;
  /** CoinGecko platform id for token prices by contract (e.g. 'ethereum'). */
  coinGeckoPlatform: string;
  /** DefiLlama chain slug for token prices by contract (e.g. 'ethereum', 'bsc'). */
  defiLlamaChain: string;
  /** Alchemy network slug (e.g. 'eth-mainnet'); omit on chains Alchemy does not serve. */
  alchemyNetwork?: string;
  /** Covalent / GoldRush chain name (e.g. 'eth-mainnet'). */
  covalentChain?: string;
  /** Moralis chain id (e.g. 'eth'). */
  moralisChain?: string;
  /** UTXO explorer config (Bitcoin, Litecoin, Dogecoin, Bitcoin Cash); served by the UTXO provider. */
  utxo?: UtxoSource;
  explorer: string;
}

export const CHAINS: Record<string, Chain> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    nativeCoinGeckoId: 'ethereum',
    coinGeckoPlatform: 'ethereum',
    defiLlamaChain: 'ethereum',
    alchemyNetwork: 'eth-mainnet',
    covalentChain: 'eth-mainnet',
    moralisChain: 'eth',
    explorer: 'https://etherscan.io',
  },
  base: {
    id: 'base',
    name: 'Base',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    nativeCoinGeckoId: 'ethereum',
    coinGeckoPlatform: 'base',
    defiLlamaChain: 'base',
    alchemyNetwork: 'base-mainnet',
    covalentChain: 'base-mainnet',
    moralisChain: 'base',
    explorer: 'https://basescan.org',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    nativeCoinGeckoId: 'ethereum',
    coinGeckoPlatform: 'arbitrum-one',
    defiLlamaChain: 'arbitrum',
    alchemyNetwork: 'arb-mainnet',
    covalentChain: 'arbitrum-mainnet',
    moralisChain: 'arbitrum',
    explorer: 'https://arbiscan.io',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    nativeCoinGeckoId: 'ethereum',
    coinGeckoPlatform: 'optimistic-ethereum',
    defiLlamaChain: 'optimism',
    alchemyNetwork: 'opt-mainnet',
    covalentChain: 'optimism-mainnet',
    moralisChain: 'optimism',
    explorer: 'https://optimistic.etherscan.io',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    nativeSymbol: 'POL',
    nativeDecimals: 18,
    // CoinGecko renamed MATIC -> POL; the old 'matic-network' id no longer resolves a price.
    nativeCoinGeckoId: 'polygon-ecosystem-token',
    coinGeckoPlatform: 'polygon-pos',
    defiLlamaChain: 'polygon',
    alchemyNetwork: 'polygon-mainnet',
    covalentChain: 'matic-mainnet',
    moralisChain: 'polygon',
    explorer: 'https://polygonscan.com',
  },
  bnb: {
    id: 'bnb',
    name: 'BNB Chain',
    nativeSymbol: 'BNB',
    nativeDecimals: 18,
    nativeCoinGeckoId: 'binancecoin',
    coinGeckoPlatform: 'binance-smart-chain',
    defiLlamaChain: 'bsc',
    alchemyNetwork: 'bnb-mainnet',
    covalentChain: 'bsc-mainnet',
    moralisChain: 'bsc',
    explorer: 'https://bscscan.com',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    nativeSymbol: 'AVAX',
    nativeDecimals: 18,
    nativeCoinGeckoId: 'avalanche-2',
    coinGeckoPlatform: 'avalanche',
    defiLlamaChain: 'avax',
    alchemyNetwork: 'avax-mainnet',
    covalentChain: 'avalanche-mainnet',
    moralisChain: 'avalanche',
    explorer: 'https://snowtrace.io',
  },

  // --- Non-EVM (served by dedicated providers; not in the default EVM sweep) ---
  // UTXO chains: no token model; native balance from a keyless public explorer.
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    ecosystem: 'bitcoin',
    nativeSymbol: 'BTC',
    nativeDecimals: 8,
    nativeCoinGeckoId: 'bitcoin',
    coinGeckoPlatform: '',
    defiLlamaChain: '',
    utxo: { kind: 'esplora', baseUrl: 'https://mempool.space' },
    explorer: 'https://mempool.space',
  },
  litecoin: {
    id: 'litecoin',
    name: 'Litecoin',
    ecosystem: 'litecoin',
    nativeSymbol: 'LTC',
    nativeDecimals: 8,
    nativeCoinGeckoId: 'litecoin',
    coinGeckoPlatform: '',
    defiLlamaChain: '',
    utxo: { kind: 'esplora', baseUrl: 'https://litecoinspace.org' },
    explorer: 'https://litecoinspace.org',
  },
  dogecoin: {
    id: 'dogecoin',
    name: 'Dogecoin',
    ecosystem: 'dogecoin',
    nativeSymbol: 'DOGE',
    nativeDecimals: 8,
    nativeCoinGeckoId: 'dogecoin',
    coinGeckoPlatform: '',
    defiLlamaChain: '',
    utxo: { kind: 'blockcypher', coin: 'doge' },
    explorer: 'https://dogechain.info',
  },
  'bitcoin-cash': {
    id: 'bitcoin-cash',
    name: 'Bitcoin Cash',
    ecosystem: 'bitcoin-cash',
    nativeSymbol: 'BCH',
    nativeDecimals: 8,
    nativeCoinGeckoId: 'bitcoin-cash',
    coinGeckoPlatform: '',
    defiLlamaChain: '',
    utxo: { kind: 'haskoin', net: 'bch' },
    explorer: 'https://www.blockchain.com/bch',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    ecosystem: 'solana',
    nativeSymbol: 'SOL',
    nativeDecimals: 9,
    nativeCoinGeckoId: 'solana',
    coinGeckoPlatform: 'solana', // CoinGecko token list + DefiLlama use 'solana'
    defiLlamaChain: 'solana',
    explorer: 'https://solscan.io',
  },
  tron: {
    id: 'tron',
    name: 'TRON',
    ecosystem: 'tron',
    nativeSymbol: 'TRX',
    nativeDecimals: 6, // smallest unit is SUN; 1 TRX = 1e6 SUN
    nativeCoinGeckoId: 'tron',
    coinGeckoPlatform: 'tron', // CoinGecko token list + DefiLlama both use 'tron'
    defiLlamaChain: 'tron',
    explorer: 'https://tronscan.org',
  },
};

export function getChain(id: string): Chain | undefined {
  return CHAINS[id.toLowerCase()];
}

export function knownChainIds(): string[] {
  return Object.keys(CHAINS);
}
