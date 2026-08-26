import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatUsd,
  normalizeContract,
  shortenAddress,
  toHumanUnits,
} from '../src/util/format';

describe('format', () => {
  it('converts raw integer balances to human units', () => {
    expect(toHumanUnits(1_500_000_000_000_000_000n, 18)).toBeCloseTo(1.5);
    expect(toHumanUnits(1_000_000n, 6)).toBe(1);
    expect(toHumanUnits(0n, 18)).toBe(0);
  });

  it('formats USD', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(0)).toBe('$0.00');
    // Sub-cent values collapse to a clean marker instead of scientific notation.
    expect(formatUsd(0.000000051)).toBe('<$0.01');
    expect(formatUsd(5)).toBe('$5.00');
  });

  it('formats token amounts and addresses', () => {
    expect(formatAmount(0)).toBe('0');
    expect(shortenAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });

  it('normalizes contracts per ecosystem', () => {
    // EVM hex is case-insensitive -> lowercased.
    expect(normalizeContract('0xAbCdEf0000000000000000000000000000000001')).toBe(
      '0xabcdef0000000000000000000000000000000001',
    );
    // Solana base58 is case-sensitive -> left intact.
    expect(normalizeContract('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    );
  });
});
