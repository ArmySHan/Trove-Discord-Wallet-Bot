import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '../util/logger';

/**
 * Creates the Discord client with the minimal intents needed for slash commands.
 * No privileged intents and no message-content intent are required.
 */
export function createClient(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  // A gateway/REST 'error' with no listener throws; log it so it never crashes the bot.
  client.on('error', (err) => logger.error({ err }, 'Discord client error'));
  return client;
}
