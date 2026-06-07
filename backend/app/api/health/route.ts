import type { NextRequest } from 'next/server';
import { aiEnabled, env } from '@/lib/env';
import { handle, json, preflight } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const GET = handle(async (req: NextRequest) =>
  json(req, {
    status: 'ok',
    ai: aiEnabled ? `groq:${env.GROQ_MODEL}` : 'mock',
    chainConfigured: Boolean(env.TASK_MARKETPLACE_ADDRESS),
    reliabilityThreshold: env.RELIABILITY_THRESHOLD,
  }),
);
