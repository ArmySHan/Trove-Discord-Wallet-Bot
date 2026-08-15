import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema. Secrets and tuning live here; everything is validated once at startup so a
 * misconfiguration fails fast with a readable message instead of a confusing runtime crash.
 */
const envSchema = z.object({
  // Discord (required)
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DEV_GUILD_ID: z.string().optional(),

  // Data providers (optional; at least one recommended)
  ALCHEMY_KEY: z.string().optional(),
  MORALIS_KEY: z.string().optional(),
  COVALENT_KEY: z.string().optional(),
  // Optional TronGrid API key (sent as TRON-PRO-API-KEY). Tron works keyless, but a free key lifts
  // the strict keyless rate limit; see https://developers.tron.network.
  TRONGRID_KEY: z.string().optional(),
  MAINNET_RPC_URL: z.string().url().optional(),

  // Behaviour
  DEFAULT_CHAINS: z.string().default('ethereum,base,arbitrum,optimism,polygon,bnb,avalanche'),
  /** Directory for local persistence (watchlists). Mount this as a volume to persist in Docker. */
  DATA_DIR: z.string().default('./data'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(90),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Loads and validates the environment once (cached). Throws a readable error if invalid. */
export function loadEnv(): Env {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Copy .env.example to .env and fill in the required values.',
    );
  }

  cached = parsed.data;
  return cached;
}

/** The list of default chains as a normalized string array. */
export function defaultChains(env: Env): string[] {
  return env.DEFAULT_CHAINS.split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}
