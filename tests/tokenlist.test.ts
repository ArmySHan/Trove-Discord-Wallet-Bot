import { describe, expect, it } from 'vitest';
import { CoinGeckoTokenRegistry, type ListLoader } from '../src/core/verify/tokenlist';

const loaderWith =
  (...entries: Array<[string, { symbol: string; decimals: number }]>): ListLoader =>
  async () =>
    new Map(entries);

describe('CoinGeckoTokenRegistry', () => {
  it('verifies listed contracts and exposes their metadata', async () => {
    const registry = new CoinGeckoTokenRegistry(
      loaderWith(['0xaaa', { symbol: 'AAA', decimals: 18 }]),
    );

    await registry.ensureLoaded(['ethereum']);

    expect(registry.isVerified('ethereum', '0xAAA')).toBe(true); // EVM is case-insensitive
    expect(registry.isVerified('ethereum', '0xbbb')).toBe(false);
    expect(registry.getMetadata('ethereum', '0xAAA')).toEqual({ symbol: 'AAA', decimals: 18 });
    expect(registry.getMetadata('ethereum', '0xbbb')).toBeUndefined();
    expect(registry.isLoaded('ethereum')).toBe(true);
    expect(registry.isLoaded('solana')).toBe(false); // never loaded -> distinguishable from "empty"
  });

  it('fails soft: an unloaded platform treats every token as verified and has no metadata', () => {
    const registry = new CoinGeckoTokenRegistry(loaderWith());
    expect(registry.isVerified('polygon-pos', '0xanything')).toBe(true);
    expect(registry.getMetadata('polygon-pos', '0xanything')).toBeUndefined();
    expect(registry.isLoaded('polygon-pos')).toBe(false);
  });

  it('loads each platform once and caches it', async () => {
    let calls = 0;
    const loader: ListLoader = async () => {
      calls += 1;
      return new Map([['0xaaa', { symbol: 'AAA', decimals: 18 }]]);
    };
    const registry = new CoinGeckoTokenRegistry(loader);

    await registry.ensureLoaded(['ethereum']);
    await registry.ensureLoaded(['ethereum']);

    expect(calls).toBe(1);
  });
});
