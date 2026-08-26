import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from './types';
import { loadEnv } from '../../config/env';
import { resolveInput } from '../../core/ens/resolve';
import { getRouter, loadPortfolio } from '../wallet/service';
import { summaryComponents } from '../wallet/components';
import { buildWalletEmbed } from '../embeds/wallet';
import { checkCooldown } from '../util/cooldown';
import { logger } from '../../util/logger';

const COOLDOWN_SECONDS = 5;

export const wallet: Command = {
  data: new SlashCommandBuilder()
    .setName('wallet')
    .setDescription("Show a wallet's on-chain portfolio across chains")
    .addStringOption((option) =>
      option
        .setName('address')
        .setDescription('Wallet address (0x…) or ENS name (vitalik.eth)')
        .setRequired(true),
    ),

  async execute(interaction) {
    const env = loadEnv();
    if (getRouter(env).providerIds.length === 0) {
      await interaction.reply({
        content:
          'This bot has no data provider configured yet. The operator needs to add a (free) ' +
          'Alchemy, Covalent, or Moralis API key.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const wait = checkCooldown(`wallet:${interaction.user.id}`, COOLDOWN_SECONDS);
    if (wait > 0) {
      await interaction.reply({
        content: `Please wait ${wait}s before looking up another wallet.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const input = interaction.options.getString('address', true);
    await interaction.deferReply();

    let resolved;
    try {
      resolved = await resolveInput(input, env);
    } catch (err) {
      await interaction.editReply({ content: `❌ ${(err as Error).message}` });
      return;
    }

    // EVM, Bitcoin and Solana are all supported; loadPortfolio routes by the address's ecosystem.
    const portfolio = await loadPortfolio(resolved.address, resolved.ens, env);
    logger.info(
      {
        address: resolved.address,
        total: portfolio.totalUsd,
        chains: portfolio.chains.length,
        sources: portfolio.sources,
      },
      'Wallet aggregated',
    );

    // Default to the clean, compact view; users expand with the "Details" button.
    await interaction.editReply({
      embeds: [buildWalletEmbed(portfolio, { compact: true })],
      components: summaryComponents(portfolio, { detailed: false }),
    });
  },
};
