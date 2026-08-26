import { EmbedBuilder } from 'discord.js';
import type { ChainPortfolio, TokenBalance, WalletPortfolio } from '../../core/models/portfolio';
import { BRAND_COLOR } from '../../util/constants';
import { formatAmount, formatUsd, formatUsdCompact, shortenAddress } from '../../util/format';

const MAX_CHAINS = 8;
const MAX_TOKENS_PER_CHAIN = 5;
/** Holdings per page in the chain drill-down view. */
export const TOKENS_PER_PAGE = 10;
// Verified holdings worth less than this are real but not worth a line; they still count toward the
// total and are summarized as "+N dust".
const DUST_USD = 0.01;

export interface SummaryOptions {
  /** Compact view: just the total and a one-line-per-chain breakdown (no token detail). */
  compact?: boolean;
}

/**
 * Builds the summary embed for a wallet's portfolio. The **compact** view (the default) shows only
 * the total and one line per chain; the **detailed** view adds each chain's top holdings and the
 * verified/unverified/dust/DeFi breakdown. The two are toggled by a button.
 */
export function buildWalletEmbed(
  portfolio: WalletPortfolio,
  opts: SummaryOptions = {},
): EmbedBuilder {
  const compact = opts.compact ?? false;
  const title = portfolio.ens
    ? `${portfolio.ens} · ${shortenAddress(portfolio.address)}`
    : shortenAddress(portfolio.address);

  const unverified = portfolio.unverifiedUsd ?? 0;
  const defi = portfolio.defiUsd ?? 0;
  const description =
    `**Total: ${formatUsd(portfolio.totalUsd)}**` +
    (defi > 0 ? `\n🏦 DeFi: ~${formatUsd(defi)}${compact ? '' : ' in positions (estimate)'}` : '') +
    // The unverified disclosure is a power-user detail — shown only in the detailed view. The total
    // already excludes it, so the compact headline is still correct.
    (!compact && unverified > 0
      ? `\n+${formatUsd(unverified)} in unverified tokens (not counted)`
      : '') +
    (portfolio.partial ? '\n⚠️ Some chains could not be loaded; this view may be incomplete.' : '');

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'Read-only · public data · not financial advice' })
    .setTimestamp(portfolio.fetchedAt);

  if (portfolio.chains.length === 0) {
    embed.addFields({
      name: 'No assets found',
      value: 'This wallet holds nothing on the supported chains.',
    });
    return embed;
  }

  if (compact) {
    const lines = portfolio.chains
      .slice(0, MAX_CHAINS)
      .map((c) => `**${c.name}** · ${formatUsd(c.totalUsd)}`);
    const moreChains = portfolio.chains.length - MAX_CHAINS;
    if (moreChains > 0) {
      lines.push(`_…and ${moreChains} more_`);
    }
    embed.addFields({ name: 'Networks', value: lines.join('\n') });
    return embed;
  }

  for (const chain of portfolio.chains.slice(0, MAX_CHAINS)) {
    embed.addFields({
      name: `${chain.name} — ${formatUsd(chain.totalUsd)}`,
      value: chainLines(chain),
    });
  }

  return embed;
}

function chainLines(chain: ChainPortfolio): string {
  const lines: string[] = [];

  if (chain.native.amount > 0) {
    lines.push(line(chain.native.amount, chain.native.symbol, chain.native.valueUsd));
  }

  // Show verified holdings worth a line; collapse the rest so the list stays readable and honest:
  //  - dust (verified but sub-cent) is summarized with a count (still in the total),
  //  - unverified-but-priced tokens (airdrop spam with a nominal price) are summarized with a value,
  //  - tokens with no market price are summarized with a count.
  const priced = chain.tokens.filter((t) => (t.valueUsd ?? 0) > 0);
  const verified = priced.filter((t) => t.verified !== false);
  const shown = verified.filter((t) => (t.valueUsd ?? 0) >= DUST_USD);
  const dust = verified.length - shown.length;
  const unverified = priced.filter((t) => t.verified === false);
  const unpriced = chain.tokens.length - priced.length;

  for (const token of shown.slice(0, MAX_TOKENS_PER_CHAIN)) {
    lines.push(line(token.amount, token.symbol, token.valueUsd));
  }

  const moreShown = shown.length - MAX_TOKENS_PER_CHAIN;
  if (moreShown > 0) {
    lines.push(`…and ${moreShown} more`);
  }

  const notes: string[] = [];
  if (unverified.length > 0) {
    const sum = unverified.reduce((acc, t) => acc + (t.valueUsd ?? 0), 0);
    notes.push(`+${unverified.length} unverified (~${formatUsdCompact(sum)})`);
  }
  if (dust > 0) {
    notes.push(`+${dust} dust`);
  }
  if (unpriced > 0) {
    notes.push(`+${unpriced} without a price`);
  }
  if (notes.length > 0) {
    lines.push(`_${notes.join(' · ')}_`);
  }

  const defiTotal = chain.defi.reduce((acc, d) => acc + d.valueUsd, 0);
  if (defiTotal > 0) {
    lines.push(`🏦 DeFi: ~${formatUsd(defiTotal)} · ${plural(chain.defi.length, 'protocol')}`);
  }

  return lines.join('\n') || '—';
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function line(amount: number, symbol: string, valueUsd: number | undefined): string {
  const value = valueUsd !== undefined ? ` · ${formatUsd(valueUsd)}` : '';
  return `${formatAmount(amount)} ${symbol}${value}`;
}

interface ChainView {
  chain: ChainPortfolio;
  items: TokenBalance[];
}

/** The full, ordered holdings list for one chain (native first, then tokens by value). */
function chainView(portfolio: WalletPortfolio, chainId: string): ChainView | undefined {
  const chain = portfolio.chains.find((c) => c.chainId === chainId);
  if (!chain) {
    return undefined;
  }
  const items: TokenBalance[] = [];
  if (chain.native.amount > 0) {
    items.push(chain.native);
  }
  items.push(...chain.tokens);
  return { chain, items };
}

/** Number of pages the drill-down view needs for a chain (always ≥ 1). */
export function chainPageCount(portfolio: WalletPortfolio, chainId: string): number {
  const view = chainView(portfolio, chainId);
  if (!view) {
    return 1;
  }
  return Math.max(1, Math.ceil(view.items.length / TOKENS_PER_PAGE));
}

/** Builds the per-chain drill-down embed: the complete holdings list, paginated. */
export function buildChainEmbed(
  portfolio: WalletPortfolio,
  chainId: string,
  page: number,
): EmbedBuilder {
  const label = portfolio.ens
    ? `${portfolio.ens} · ${shortenAddress(portfolio.address)}`
    : shortenAddress(portfolio.address);

  const view = chainView(portfolio, chainId);
  if (!view) {
    return new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(label)
      .setDescription('That chain is no longer part of this portfolio.');
  }

  const pages = Math.max(1, Math.ceil(view.items.length / TOKENS_PER_PAGE));
  const current = Math.min(Math.max(0, page), pages - 1);
  const slice = view.items.slice(current * TOKENS_PER_PAGE, (current + 1) * TOKENS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${view.chain.name} — ${formatUsd(view.chain.totalUsd)}`)
    .setDescription(slice.map(detailLine).join('\n') || '—')
    .setFooter({ text: `${label} · page ${current + 1}/${pages}` })
    .setTimestamp(portfolio.fetchedAt);

  const unverified = view.chain.unverifiedUsd ?? 0;
  if (unverified > 0) {
    embed.addFields({
      name: '​',
      value: `_+${formatUsd(unverified)} in unverified tokens (not counted)_`,
    });
  }

  if (view.chain.defi.length > 0) {
    const rows = view.chain.defi
      .slice(0, 6)
      .map((d) => `${d.protocol} · ~${formatUsd(d.valueUsd)}`);
    const more = view.chain.defi.length - 6;
    if (more > 0) {
      rows.push(`…and ${more} more`);
    }
    embed.addFields({ name: '🏦 DeFi positions (estimate)', value: rows.join('\n') });
  }
  return embed;
}

function detailLine(token: TokenBalance): string {
  const value = token.valueUsd !== undefined ? ` · ${formatUsd(token.valueUsd)}` : ' · _no price_';
  const tag = !token.isNative && token.verified === false ? ' · _unverified_' : '';
  return `${formatAmount(token.amount)} ${token.symbol}${value}${tag}`;
}
