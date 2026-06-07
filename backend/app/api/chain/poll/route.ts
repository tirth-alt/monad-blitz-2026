import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { Unauthorized } from '@/lib/errors';
import { handle, json, preflight } from '@/lib/http';
import { pollChain } from '@/lib/services/chain/poll';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const OPTIONS = preflight;

/**
 * Cron-driven chain poller (replaces the long-running watcher). Vercel Cron
 * calls this on a schedule with `Authorization: Bearer <CRON_SECRET>`. If
 * CRON_SECRET is set we require it; otherwise (local dev) it's open.
 */
async function run(req: NextRequest) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${env.CRON_SECRET}`) throw Unauthorized('Invalid cron secret', 'INVALID_CRON_SECRET');
  }
  const result = await pollChain();
  return json(req, result);
}

export const GET = handle(run);
export const POST = handle(run);
