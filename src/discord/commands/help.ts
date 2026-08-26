import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from './types';
import { BOT_NAME, BRAND_COLOR, TAGLINE } from '../../util/constants';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription(`What ${BOT_NAME} can do and how to use it`),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`${BOT_NAME} — help`)
      .setDescription(TAGLINE)
      .addFields(
        {
          name: '/wallet `<address>`',
          value:
            "Show a wallet's portfolio across many chains — native coins, tokens (verified totals, " +
            'spam filtered) and DeFi positions. Accepts an EVM address or ENS, a Bitcoin / Litecoin / ' +
            'Dogecoin / Bitcoin Cash address, a Solana address, or a TRON address.\n' +
            'Opens **compact** — tap **Details** for the full breakdown, the **menu** to open a chain, ' +
            'and **Prev/Next/Refresh** to page or re-fetch.',
        },
        {
          name: '/watchlist `add|remove|list`',
          value: 'Save wallet addresses to track together (private to you).',
        },
        {
          name: '/portfolio',
          value: 'The combined value of every wallet on your watchlist.',
        },
        { name: '/help', value: 'Show this message.' },
        { name: '/about', value: 'About the project and its privacy model.' },
      )
      .setFooter({ text: 'Read-only · public data only · never asks for keys' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
