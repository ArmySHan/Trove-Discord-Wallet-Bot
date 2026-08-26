import { describe, expect, it } from 'vitest';
import { isWalletComponent, parseWalletCustomId } from '../src/discord/wallet/components';
import { chainPageCount } from '../src/discord/embeds/wallet';
import type { WalletPortfolio } from '../src/core/models/portfolio';

describe('parseWalletCustomId', () => {
  it('recognizes wallet customIds', () => {
    expect(isWalletComponent('w:cs:0xabc')).toBe(true);
    expect(isWalletComponent('other:x')).toBe(false);
  });

  it('parses each action, including the compact/detailed mode', () => {
    expect(parseWalletCustomId('w:cs:0xabc')).toEqual({ kind: 'chain', address: '0xabc' });
    expect(parseWalletCustomId('w:p:0xabc:ethereum:3')).toEqual({
      kind: 'page',
      address: '0xabc',
      chainId: 'ethereum',
      page: 3,
    });
    expect(parseWalletCustomId('w:r:0xabc:c')).toEqual({
      kind: 'refresh',
      address: '0xabc',
      detailed: false,
    });
    expect(parseWalletCustomId('w:r:0xabc:d')).toEqual({
      kind: 'refresh',
      address: '0xabc',
      detailed: true,
    });
    expect(parseWalletCustomId('w:s:0xabc:c')).toEqual({
      kind: 'summary',
      address: '0xabc',
      detailed: false,
    });
    expect(parseWalletCustomId('w:s:0xabc:d')).toEqual({
      kind: 'summary',
      address: '0xabc',
      detailed: true,
    });
  });

  it('rejects malformed or unknown ids', () => {
    expect(parseWalletCustomId('x:cs:0xabc')).toBeNull();
    expect(parseWalletCustomId('w:zz:0xabc')).toBeNull();
    expect(parseWalletCustomId('w:cs:')).toBeNull();
    expect(parseWalletCustomId('w:p:0xabc')).toBeNull(); // page needs a chainId
  });

  it('defaults an invalid page to 0', () => {
    expect(parseWalletCustomId('w:p:0xabc:ethereum:nope')).toEqual({
      kind: 'page',
      address: '0xabc',
      chainId: 'ethereum',
      page: 0,
    });
  });
});

describe('chainPageCount', () => {
  const portfolio = (tokenCount: number): WalletPortfolio => ({
    address: '0xabc',
    totalUsd: 0,
    chains: [
      {
        chainId: 'ethereum',
        name: 'Ethereum',
        native: { symbol: 'ETH', name: 'Ethereum', amount: 1, decimals: 18, isNative: true },
        tokens: Array.from({ length: tokenCount }, (_, i) => ({
          symbol: `T${i}`,
          name: '',
          amount: 1,
          decimals: 18,
        })),
        defi: [],
        nfts: { count: 0 },
        totalUsd: 0,
      },
    ],
    fetchedAt: 0,
    partial: false,
    sources: [],
  });

  it('paginates native + tokens, 10 per page, at least one page', () => {
    expect(chainPageCount(portfolio(0), 'ethereum')).toBe(1); // just native
    expect(chainPageCount(portfolio(20), 'ethereum')).toBe(3); // 1 + 20 = 21 -> 3 pages
    expect(chainPageCount(portfolio(0), 'missing')).toBe(1);
  });
});
