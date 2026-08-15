import { createPublicClient, getAddress, http, isAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import type { Env } from '../../config/env';

export type Ecosystem =
  | 'evm'
  | 'bitcoin'
  | 'litecoin'
  | 'dogecoin'
  | 'bitcoin-cash'
  | 'solana'
  | 'tron'
  | 'unknown';

/**
 * Guess which ecosystem an input belongs to from its format.
 *
 * UTXO base58 chains share Bitcoin's alphabet, so detection leans on distinct prefixes (bech32
 * `bc1`/`ltc1`, BCH cashaddr `q`/`p`, legacy `L`/`M` for LTC, `D`/`9`/`A` for DOGE, `1`/`3` for BTC).
 * The legacy patterns are capped at 34 chars so they don't swallow 35–44-char Solana addresses,
 * which are checked last. Old-style Litecoin `3…` P2SH addresses overlap Bitcoin and resolve to BTC.
 */
export function detectEcosystem(input: string): Ecosystem {
  const s = input.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) {
    return 'evm';
  }

  // Unambiguous bech32 prefixes.
  if (/^bc1[a-z0-9]{6,87}$/.test(s)) {
    return 'bitcoin';
  }
  if (/^ltc1[a-z0-9]{6,87}$/.test(s)) {
    return 'litecoin';
  }

  // Bitcoin Cash cashaddr, with or without the "bitcoincash:" prefix.
  if (/^(bitcoincash:)?[qp][a-z0-9]{41}$/.test(s)) {
    return 'bitcoin-cash';
  }

  // Legacy base58, by version prefix (capped at 34 chars; see the note above).
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{20,33}$/.test(s)) {
    return 'litecoin';
  }
  if (/^[D9A][a-km-zA-HJ-NP-Z1-9]{20,33}$/.test(s)) {
    return 'dogecoin';
  }
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{20,33}$/.test(s)) {
    return 'bitcoin';
  }

  // TRON Base58Check: 'T' + 33 chars (34 total). MUST be checked before Solana, whose 32–44 range
  // would otherwise swallow every Tron address — same ordering technique as the legacy UTXO patterns.
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s)) {
    return 'tron';
  }

  // Solana base58 (32–44) — checked last so the capped legacy + Tron patterns take precedence.
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) {
    return 'solana';
  }

  return 'unknown';
}

export interface ResolvedAddress {
  /** Checksummed address for EVM; raw input otherwise. */
  address: string;
  ens?: string;
  ecosystem: Ecosystem;
}

/** Resolves an ENS name or validates a raw address. Throws a user-friendly error on bad input. */
export async function resolveInput(input: string, env: Env): Promise<ResolvedAddress> {
  const raw = input.trim();

  if (raw.toLowerCase().endsWith('.eth')) {
    const rpc = mainnetRpc(env);
    if (!rpc) {
      throw new Error(
        'ENS names need an Ethereum mainnet RPC. Set MAINNET_RPC_URL or ALCHEMY_KEY.',
      );
    }
    const client = createPublicClient({ chain: mainnet, transport: http(rpc) });
    const address = await client.getEnsAddress({ name: normalize(raw) });
    if (!address) {
      throw new Error(`Could not resolve ENS name: ${raw}`);
    }
    return { address: getAddress(address), ens: raw.toLowerCase(), ecosystem: 'evm' };
  }

  const ecosystem = detectEcosystem(raw);
  if (ecosystem === 'evm') {
    if (!isAddress(raw)) {
      throw new Error(`That doesn't look like a valid address: \`${raw}\``);
    }
    return { address: getAddress(raw), ecosystem: 'evm' };
  }

  if (ecosystem === 'unknown') {
    throw new Error(`That doesn't look like a wallet address or ENS name: \`${raw}\``);
  }
  // Non-EVM (Bitcoin/UTXO/Solana/Tron): return the detected ecosystem; the router handles fetching.
  // Strip the optional "bitcoincash:" prefix so its colon never reaches a cache key or a component
  // customId (which are colon-delimited). The Haskoin source accepts the prefix-less cashaddr.
  const address = ecosystem === 'bitcoin-cash' ? raw.replace(/^bitcoincash:/i, '') : raw;
  return { address, ecosystem };
}

function mainnetRpc(env: Env): string | undefined {
  if (env.MAINNET_RPC_URL) {
    return env.MAINNET_RPC_URL;
  }
  if (env.ALCHEMY_KEY) {
    return `https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_KEY}`;
  }
  return undefined;
}
