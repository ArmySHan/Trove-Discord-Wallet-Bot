import { REST, Routes } from 'discord.js';
import { loadEnv } from '../config/env';
import { commands } from './commands';
import { logger } from '../util/logger';

/**
 * Registers slash commands with Discord. Run via `npm run register`.
 * - With DEV_GUILD_ID set: registers to that guild (appears instantly) — use during development.
 * - Without it: registers globally (can take up to ~1 hour to propagate) — use in production.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const body = commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  if (env.DEV_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DEV_GUILD_ID), {
      body,
    });
    logger.info({ count: body.length, guild: env.DEV_GUILD_ID }, 'Registered guild commands');
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
    logger.info({ count: body.length }, 'Registered global commands (may take up to ~1h)');
  }
}

main().catch((err) => {
  logger.error({ err }, 'Failed to register commands');
  process.exit(1);
});
