import { Events, type Client } from 'discord.js';
import { logger } from '../../util/logger';
import { BOT_NAME } from '../../util/constants';

/** Logs a line once the bot is connected and ready. */
export function registerReady(client: Client): void {
  client.once(Events.ClientReady, (ready) => {
    logger.info({ tag: ready.user.tag, guilds: ready.guilds.cache.size }, `${BOT_NAME} is online`);
  });
}
