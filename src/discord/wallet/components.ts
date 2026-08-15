import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { formatUsd } from '../../util/format';
import type { WalletPortfolio } from '../../core/models/portfolio';

const PREFIX = 'w';

type Row = ActionRowBuilder<MessageActionRowComponentBuilder>;
const row = (...c: MessageActionRowComponentBuilder[]): Row =>
  new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...c);

/**
 * Wallet components are stateless: the wallet address (and the view mode / chain / page) is encoded
 * in the customId, so any interaction can re-derive its view from the cache without server state.
 * customId form: `w:<action>:<address>[:<arg>[:<page>]]` — `<arg>` is the mode (`c`/`d`) for the
 * summary and refresh, and the chain id for pagination.
 */
export type WalletAction =
  | { kind: 'chain'; address: string }
  | { kind: 'page'; address: string; chainId: string; page: number }
  | { kind: 'refresh'; address: string; detailed: boolean }
  | { kind: 'summary'; address: string; detailed: boolean };

export function isWalletComponent(customId: string): boolean {
  return customId.startsWith(`${PREFIX}:`);
}

export function parseWalletCustomId(customId: string): WalletAction | null {
  const [prefix, action, address, arg, page] = customId.split(':');
  if (prefix !== PREFIX || !address) {
    return null;
  }
  switch (action) {
    case 'cs':
      return { kind: 'chain', address };
    case 'p':
      return arg ? { kind: 'page', address, chainId: arg, page: toPage(page) } : null;
    case 'r':
      return { kind: 'refresh', address, detailed: arg === 'd' };
    case 's':
      return { kind: 'summary', address, detailed: arg === 'd' };
    default:
      return null;
  }
}

export interface SummaryComponentOptions {
  detailed?: boolean;
}

/** Summary view: a chain picker (drill-down), a Compact/Details toggle, and a Refresh button. */
export function summaryComponents(
  portfolio: WalletPortfolio,
  opts: SummaryComponentOptions = {},
): Row[] {
  const detailed = opts.detailed ?? false;
  const mode = detailed ? 'd' : 'c';
  const rows: Row[] = [];

  if (portfolio.chains.length > 0) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`${PREFIX}:cs:${portfolio.address}`)
      .setPlaceholder('View a chain in detail')
      .addOptions(
        portfolio.chains.slice(0, 25).map((c) => ({
          label: c.name,
          description: formatUsd(c.totalUsd),
          value: c.chainId,
        })),
      );
    rows.push(row(menu));
  }

  const toggle = new ButtonBuilder()
    .setCustomId(`${PREFIX}:s:${portfolio.address}:${detailed ? 'c' : 'd'}`)
    .setLabel(detailed ? 'Compact' : 'Details')
    .setEmoji(detailed ? '📋' : '📊')
    .setStyle(ButtonStyle.Secondary);

  const refresh = new ButtonBuilder()
    .setCustomId(`${PREFIX}:r:${portfolio.address}:${mode}`)
    .setLabel('Refresh')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Secondary);

  rows.push(row(toggle, refresh));

  return rows;
}

/** Chain detail view: Prev / Next pagination plus a Back-to-summary button. */
export function chainComponents(
  address: string,
  chainId: string,
  page: number,
  totalPages: number,
): Row[] {
  const prev = new ButtonBuilder()
    .setCustomId(`${PREFIX}:p:${address}:${chainId}:${page - 1}`)
    .setLabel('‹ Prev')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 0);

  const next = new ButtonBuilder()
    .setCustomId(`${PREFIX}:p:${address}:${chainId}:${page + 1}`)
    .setLabel('Next ›')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages - 1);

  const back = new ButtonBuilder()
    .setCustomId(`${PREFIX}:s:${address}:c`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Primary);

  return [row(prev, next, back)];
}

function toPage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
