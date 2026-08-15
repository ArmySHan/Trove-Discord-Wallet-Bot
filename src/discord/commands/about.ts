import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from './types';
import { BOT_NAME, BRAND_COLOR, REPO_URL, TAGLINE } from '../../util/constants';

export const about: Command = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription(`About ${BOT_NAME} and how it handles your data`),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`About ${BOT_NAME}`)
      .setDescription(TAGLINE)
      .addFields(
        {
          name: 'Read-only & no keys',
          value:
            'Trove only reads **public** addresses and public market data. It never asks for a ' +
            'private key or seed phrase and cannot move any funds.',
        },
        {
          name: 'Open source',
          value: `Free and MIT-licensed. Source: ${REPO_URL}`,
        },
        {
          name: 'Not financial advice',
          value:
            'Data comes from third-party providers and may be delayed or inaccurate. For tracking ' +
            'and education only.',
        },
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
