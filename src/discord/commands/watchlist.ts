import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from './types';
import { loadEnv } from '../../config/env';
import { resolveInput } from '../../core/ens/resolve';
import { getStore } from '../storage';
import { MAX_WATCH_PER_USER } from '../../core/storage/store';
import { BRAND_COLOR } from '../../util/constants';
import { shortenAddress } from '../../util/format';

export const watchlist: Command = {
  data: new SlashCommandBuilder()
    .setName('watchlist')
    .setDescription('Save wallet addresses to track together with /portfolio')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Save a wallet to your watchlist')
        .addStringOption((o) =>
          o.setName('address').setDescription('Address or ENS name').setRequired(true),
        )
        .addStringOption((o) =>
          o.setName('label').setDescription('Optional name to remember it by'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a wallet from your watchlist')
        .addStringOption((o) =>
          o.setName('address').setDescription('Saved address or ENS name').setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('Show your saved wallets')),

  async execute(interaction) {
    const env = loadEnv();
    const store = getStore(env);
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const entries = await store.listWatch(userId);
      if (entries.length === 0) {
        await interaction.reply({
          content: 'Your watchlist is empty. Add one with `/watchlist add`.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle('Your watchlist')
        .setDescription(
          entries
            .map(
              (e, i) =>
                `**${i + 1}.** ${e.label ? `${e.label} — ` : ''}\`${shortenAddress(e.address)}\``,
            )
            .join('\n'),
        )
        .setFooter({
          text: `${entries.length}/${MAX_WATCH_PER_USER} · view totals with /portfolio`,
        });
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const input = interaction.options.getString('address', true);
    let resolved;
    try {
      resolved = await resolveInput(input, env);
    } catch (err) {
      await interaction.reply({
        content: `❌ ${(err as Error).message}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'add') {
      const label = interaction.options.getString('label') ?? resolved.ens;
      const result = await store.addWatch(userId, {
        address: resolved.address,
        label: label ?? undefined,
        addedAt: Date.now(),
      });
      const message =
        result === 'added'
          ? `✅ Added \`${shortenAddress(resolved.address)}\`${label ? ` (${label})` : ''} to your watchlist.`
          : result === 'exists'
            ? 'That wallet is already on your watchlist.'
            : `Your watchlist is full (${MAX_WATCH_PER_USER}). Remove one first.`;
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
      return;
    }

    // remove
    const removed = await store.removeWatch(userId, resolved.address);
    await interaction.reply({
      content: removed
        ? `🗑️ Removed \`${shortenAddress(resolved.address)}\` from your watchlist.`
        : 'That wallet was not on your watchlist.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
