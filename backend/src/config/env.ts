import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for environment configuration.
 * Validated once at startup — if anything required is missing/malformed,
 * the process exits with a clear message instead of failing mysteriously later.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  // AI — Groq (free)
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  AI_MOCK_MODE: z
    .string()
    .default('false')
    .transform((s) => s.toLowerCase() === 'true'),

  // Auth — secret used to sign login tokens (JWT).
  JWT_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Marketplace rules
  // Minimum reliability score (0-10) an agent needs to be assigned/execute tasks.
  RELIABILITY_THRESHOLD: z.coerce.number().min(0).max(10).default(8),

  // DB
  DATABASE_PATH: z.string().default('./data/chainmind.db'),

  // Chain
  MONAD_RPC_URL: z.string().url().default('https://testnet-rpc.monad.xyz'),
  MONAD_CHAIN_ID: z.coerce.number().int().positive().default(10143),
  MONAD_EXPLORER_URL: z.string().url().default('https://testnet.monadexplorer.com'),
  AGENT_REGISTRY_ADDRESS: z.string().optional(),
  TASK_MARKETPLACE_ADDRESS: z.string().optional(),
  REPUTATION_STORE_ADDRESS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

// Refuse to run in production with the insecure default signing secret.
if (isProd && env.JWT_SECRET === 'dev-only-insecure-secret-change-me') {
  // eslint-disable-next-line no-console
  console.error('❌ JWT_SECRET must be set to a strong value in production');
  process.exit(1);
}

/** True only when we actually have a key AND mock mode is off. */
export const aiEnabled = !env.AI_MOCK_MODE && Boolean(env.GROQ_API_KEY);
