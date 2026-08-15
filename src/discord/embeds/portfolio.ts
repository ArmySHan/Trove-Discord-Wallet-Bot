import { EmbedBuilder } from 'discord.js';
import type { WalletPortfolio } from '../../core/models/portfolio';
import type { WatchEntry } from '../../core/storage/store';
import { BRAND_COLOR } from '../../util/constants';
import { formatUsd, shortenAddress } from '../../util/format';

export interface PortfolioItem {
  entry: WatchEntry;
  portfolio: WalletPortfolio | null; // null when the wallet could not be loaded
}

const MAX_WALLETS_SHOWN = 25;

/** Combined-value embed for a user's saved wallets. */
export function buildPortfolioEmbed(items: PortfolioItem[]): EmbedBuilder {
  const loaded = items.filter((it) => it.portfolio);
  const total = loaded.reduce((sum, it) => sum + (it.portfolio?.totalUsd ?? 0), 0);
  const failed = items.length - loaded.length;

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('Your portfolio')
    .setDescription(
      `**Total: ${formatUsd(total)}** across ${loaded.length} wallet${loaded.length === 1 ? '' : 's'}` +
        (failed > 0 ? `\n⚠️ ${failed} wallet${failed === 1 ? '' : 's'} could not be loaded.` : ''),
    )
    .setFooter({ text: 'Read-only · verified totals · not financial advice' });

  const sorted = [...items].sort(
    (a, b) => (b.portfolio?.totalUsd ?? 0) - (a.portfolio?.totalUsd ?? 0),
  );
  for (const it of sorted.slice(0, MAX_WALLETS_SHOWN)) {
    const name = it.entry.label ?? shortenAddress(it.entry.address);
    const value = it.portfolio ? formatUsd(it.portfolio.totalUsd) : '_unavailable_';
    embed.addFields({ name, value: `${value} · \`${shortenAddress(it.entry.address)}\`` });
  }
  return embed;
}
