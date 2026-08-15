import { loadEnv } from './config/env';
import { createClient } from './discord/client';
import { registerReady } from './discord/events/ready';
import { registerInteractions } from './discord/events/interactionCreate';
import { logger } from './util/logger';

async function main(): Promise<void> {
  const env = loadEnv();
  const client = createClient();

  registerReady(client);
  registerInteractions(client);

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');
    void client.destroy();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep the long-running bot alive: log stray failures instead of letting Node terminate the process.
  process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled rejection'));
  process.on('uncaughtException', (err) => logger.error({ err }, 'Uncaught exception'));

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
