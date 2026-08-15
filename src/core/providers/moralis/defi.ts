import type { DefiPosition, DefiPositionType } from '../../models/portfolio';

/** Shape of Moralis's `/wallets/{address}/defi/summary` response (only the fields Trove uses). */
export interface MoralisDefiSummary {
  total_usd_value?: number;
  protocols?: Array<{
    protocol_name?: string;
    protocol_id?: string;
    total_usd_value?: number;
    positions?: number;
  }>;
}

/** Maps Moralis's per-protocol DeFi summary into Trove's `DefiPosition[]` (highest value first). */
export function mapMoralisDefi(summary: MoralisDefiSummary): DefiPosition[] {
  return (summary.protocols ?? [])
    .filter((p) => (p.total_usd_value ?? 0) > 0)
    .map((p) => ({
      protocol: p.protocol_name ?? p.protocol_id ?? 'Unknown',
      type: inferType(p.protocol_name ?? p.protocol_id ?? ''),
      items: [],
      valueUsd: p.total_usd_value ?? 0,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

/** Best-effort category from a protocol's name, for a friendlier label. */
function inferType(name: string): DefiPositionType {
  const n = name.toLowerCase();
  if (/aave|compound|morpho|spark|fluid|lend/.test(n)) return 'lending';
  if (/lido|rocket|ether\.?fi|renzo|stake|staking/.test(n)) return 'staking';
  if (/curve|convex|yearn|vault|beefy/.test(n)) return 'vault';
  if (/farm|gauge/.test(n)) return 'farm';
  if (/uniswap|sushi|balancer|pancake|aerodrome|velodrome|pool|lp/.test(n)) return 'lp';
  return 'other';
}
