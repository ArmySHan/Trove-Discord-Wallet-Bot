/** Display formatting helpers (USD, token amounts, addresses). */

/** Format a USD value, e.g. 1234.5 -> "$1,234.50"; tiny values keep more precision. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return '$0.00';
  }
  const abs = Math.abs(value);
  if (abs > 0 && abs < 0.01) {
    // Avoid ugly scientific notation (e.g. "5.1e-8") for sub-cent values.
    return value > 0 ? '<$0.01' : '>-$0.01';
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact USD for big numbers, e.g. 1_500_000 -> "$1.5M". */
export function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return '$0';
  }
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return formatUsd(value);
}

/** Convert a raw on-chain integer balance to human units. */
export function toHumanUnits(raw: bigint, decimals: number): number {
  if (decimals <= 0) {
    return Number(raw);
  }
  const divisor = 10 ** decimals;
  // Split to keep precision for large balances.
  const whole = raw / 10n ** BigInt(decimals);
  const frac = raw % 10n ** BigInt(decimals);
  return Number(whole) + Number(frac) / divisor;
}

/** Format a token amount for display, trimming trailing zeros. */
export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '0';
  }
  if (amount === 0) {
    return '0';
  }
  const maxFraction = amount < 1 ? 6 : amount < 1000 ? 4 : 2;
  return amount.toLocaleString('en-US', { maximumFractionDigits: maxFraction });
}

/**
 * Normalizes a contract/mint for case-insensitive comparison. EVM hex addresses (0x…) are
 * case-insensitive and get lowercased; non-EVM identifiers (e.g. Solana base58 mints) are
 * case-sensitive and returned unchanged.
 */
export function normalizeContract(address: string): string {
  return address.startsWith('0x') ? address.toLowerCase() : address;
}

/** Shorten an address, e.g. "0x1234…cdef". */
export function shortenAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
