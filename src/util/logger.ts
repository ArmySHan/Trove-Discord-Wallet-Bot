import { pino } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Structured application logger. In development it pretty-prints; in production it emits JSON.
 * Reads the level straight from the environment so it works before config validation runs.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
});
