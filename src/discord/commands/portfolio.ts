import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import pLimit from 'p-limit';
import type { Command } from './types';
import { loadEnv } from '../../config/env';
import { getStore } from '../storage';
import { getRouter, loadPortfolio } from '../wallet/service';
import { buildPortfolioEmbed, type PortfolioItem } from '../embeds/portfolio';
import { checkCooldown } from '../util/cooldown';

const WALLET_CONCURRENCY = 3;
const COOLDOWN_SECONDS = 15;

export const portfolio: Command = {
  data: new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Combined value of the wallets on your watchlist'),

  async execute(interaction) {
    const env = loadEnv();
    if (getRouter(env).providerIds.length === 0) {
      await interaction.reply({
        content: 'This bot has no data provider configured yet.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const wait = checkCooldown(`portfolio:${interaction.user.id}`, COOLDOWN_SECONDS);
    if (wait > 0) {
      await interaction.reply({
        content: `Please wait ${wait}s before refreshing your portfolio.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const entries = await getStore(env).listWatch(interaction.user.id);
    if (entries.length === 0) {
      await interaction.reply({
        content: 'You have no saved wallets yet. Add one with `/watchlist add`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const limit = pLimit(WALLET_CONCURRENCY);
    const items: PortfolioItem[] = await Promise.all(
      entries.map((entry) =>
        limit(async () => {
          try {
            return { entry, portfolio: await loadPortfolio(entry.address, undefined, env) };
          } catch {
            return { entry, portfolio: null };
          }
        }),
      ),
    );

    await interaction.editReply({ embeds: [buildPortfolioEmbed(items)] });
  },
};
