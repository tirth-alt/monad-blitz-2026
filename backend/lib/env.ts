import { z } from 'zod';

/**
 * Validated environment. Next.js loads `.env.local` automatically, so we just
 * read `process.env` here. Parsed once per server instance.
 */
const envSchema = z.object({
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

  // Auth
  JWT_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // DB (libSQL / Turso)
  DATABASE_URL: z.string().default('file:./data/chainmind.db'),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Marketplace rules
  RELIABILITY_THRESHOLD: z.coerce.number().min(0).max(10).default(8),

  // Chain
  MONAD_RPC_URL: z.string().url().default('https://testnet-rpc.monad.xyz'),
  MONAD_CHAIN_ID: z.coerce.number().int().positive().default(10143),
  MONAD_EXPLORER_URL: z.string().url().default('https://testnet.monadexplorer.com'),
  AGENT_REGISTRY_ADDRESS: z.string().optional(),
  TASK_MARKETPLACE_ADDRESS: z.string().optional(),
  REPUTATION_STORE_ADDRESS: z.string().optional(),

  CRON_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const aiEnabled = !env.AI_MOCK_MODE && Boolean(env.GROQ_API_KEY);

// Enforce a strong signing secret at runtime in production — but not during
// `next build` (NODE_ENV is 'production' then too, yet the real secret is only
// injected at runtime on the host).
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
if (isProd && !isBuildPhase && env.JWT_SECRET === 'dev-only-insecure-secret-change-me') {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}
