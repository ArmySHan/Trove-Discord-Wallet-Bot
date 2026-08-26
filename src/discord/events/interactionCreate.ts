import { Events, MessageFlags, type Client, type Interaction } from 'discord.js';
import { commandMap } from '../commands';
import { handleWalletComponent } from '../wallet/interactions';
import { isWalletComponent } from '../wallet/components';
import { logger } from '../../util/logger';

/** Routes incoming interactions to their command or component handler. */
export function registerInteractions(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commandMap.get(interaction.commandName);
        if (!command) {
          logger.warn({ command: interaction.commandName }, 'Unknown command');
          return;
        }
        await command.execute(interaction);
        return;
      }

      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        isWalletComponent(interaction.customId)
      ) {
        await handleWalletComponent(interaction);
      }
    } catch (err) {
      logger.error({ err }, 'Interaction failed');
      await respondError(interaction);
    }
  });
}

async function respondError(interaction: Interaction): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }
  const message = 'Something went wrong. Please try again.';
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  } catch {
    // The interaction may have expired; nothing more we can do.
  }
}
