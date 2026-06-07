import { randomUUID } from 'node:crypto';
import { query, run } from '../db';
import type { FeedEvent } from '../types';

interface FeedRow extends Omit<FeedEvent, 'payload'> {
  payload: string;
}

function rowToEvent(r: FeedRow): FeedEvent {
  return { ...r, payload: JSON.parse(r.payload) as Record<string, unknown> };
}

/**
 * Persist a feed event. On serverless there's no in-process event bus, so the
 * live feed is DB-backed: clients poll `/api/feed/recent?since=` for new rows.
 */
export async function publishEvent(input: {
  type: string;
  txHash?: string | null;
  blockNumber?: number | null;
  payload?: Record<string, unknown>;
}): Promise<FeedEvent> {
  const id = randomUUID();
  await run(
    `INSERT INTO feed_events (id, type, tx_hash, block_number, payload) VALUES (?, ?, ?, ?, ?)`,
    [id, input.type, input.txHash ?? null, input.blockNumber ?? null, JSON.stringify(input.payload ?? {})],
  );
  return {
    id,
    type: input.type,
    tx_hash: input.txHash ?? null,
    block_number: input.blockNumber ?? null,
    payload: input.payload ?? {},
    created_at: new Date().toISOString(),
  };
}

/** Most recent events, newest first. */
export async function recentEvents(limit = 25): Promise<FeedEvent[]> {
  const rows = await query<FeedRow>(
    'SELECT * FROM feed_events ORDER BY created_at DESC, rowid DESC LIMIT ?',
    [limit],
  );
  return rows.map(rowToEvent);
}

/** Events created strictly after `since` (ISO timestamp), oldest first. */
export async function eventsSince(since: string, limit = 100): Promise<FeedEvent[]> {
  const rows = await query<FeedRow>(
    'SELECT * FROM feed_events WHERE created_at > ? ORDER BY created_at ASC, rowid ASC LIMIT ?',
    [since, limit],
  );
  return rows.map(rowToEvent);
}
