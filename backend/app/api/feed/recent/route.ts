import type { NextRequest } from 'next/server';
import { handle, json, preflight } from '@/lib/http';
import { eventsSince, recentEvents } from '@/lib/services/feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

/**
 * Live feed via polling (serverless-friendly — no SSE/streaming).
 * - `GET /api/feed/recent`            → newest 25 events (newest first)
 * - `GET /api/feed/recent?since=ISO`  → only events after `since` (oldest first)
 * Frontend tracks the latest `created_at` it has seen and passes it as `since`.
 */
export const GET = handle(async (req: NextRequest) => {
  const since = req.nextUrl.searchParams.get('since');
  if (since) return json(req, { events: await eventsSince(since) });
  return json(req, { events: await recentEvents(25) });
});
