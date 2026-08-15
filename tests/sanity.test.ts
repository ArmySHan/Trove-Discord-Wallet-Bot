import { describe, expect, it } from 'vitest';
import { BOT_NAME } from '../src/util/constants';
import { defaultChains, type Env } from '../src/config/env';

describe('sanity', () => {
  it('exposes the bot name', () => {
    expect(BOT_NAME).toBe('Trove');
  });

  it('parses DEFAULT_CHAINS into a trimmed, lowercased list', () => {
    const env = { DEFAULT_CHAINS: 'Ethereum, base ,ARBITRUM,' } as unknown as Env;
    expect(defaultChains(env)).toEqual(['ethereum', 'base', 'arbitrum']);
  });
});
