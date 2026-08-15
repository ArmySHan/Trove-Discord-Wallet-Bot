import { describe, expect, it } from 'vitest';
import { buildRouter } from '../src/core/providers/router';
import { getChain, type Chain } from '../src/config/chains';
import type { Env } from '../src/config/env';

const env = (keys: Partial<Env>): Env => keys as unknown as Env;

describe('buildRouter', () => {
  it('includes configured EVM providers plus the keyless/keyed non-EVM ones, in preference order', () => {
    const router = buildRouter(env({ MORALIS_KEY: 'm', ALCHEMY_KEY: 'a', COVALENT_KEY: 'c' }));
    // UTXO + TRON need no key; Solana rides on the Moralis key.
    expect(router.providerIds).toEqual([
      'alchemy',
      'covalent',
      'moralis',
      'utxo',
      'solana',
      'tron',
    ]);
  });

  it('always offers the keyless UTXO and TRON providers even when no API keys are configured', () => {
    expect(buildRouter(env({})).providerIds).toEqual(['utxo', 'tron']);
  });

  it('routes each non-EVM chain to its dedicated provider', () => {
    const router = buildRouter(env({ MORALIS_KEY: 'm' }));
    for (const id of ['bitcoin', 'litecoin', 'dogecoin', 'bitcoin-cash']) {
      expect(router.providersFor(getChain(id)!).map((p) => p.id)).toEqual(['utxo']);
    }
    expect(router.providersFor(getChain('solana')!).map((p) => p.id)).toEqual(['solana']);
    expect(router.providersFor(getChain('tron')!).map((p) => p.id)).toEqual(['tron']);
  });

  it('offers every supporting provider for a chain, best first', () => {
    const router = buildRouter(env({ ALCHEMY_KEY: 'a', COVALENT_KEY: 'c', MORALIS_KEY: 'm' }));
    expect(router.providersFor(getChain('ethereum')!).map((p) => p.id)).toEqual([
      'alchemy',
      'covalent',
      'moralis',
    ]);
  });

  it('filters out providers that do not serve a chain', () => {
    const router = buildRouter(env({ ALCHEMY_KEY: 'a', COVALENT_KEY: 'c', MORALIS_KEY: 'm' }));
    // A hypothetical chain that only Covalent covers.
    const covalentOnly: Chain = {
      ...getChain('ethereum')!,
      alchemyNetwork: undefined,
      moralisChain: undefined,
    };
    expect(router.providersFor(covalentOnly).map((p) => p.id)).toEqual(['covalent']);
  });
});
