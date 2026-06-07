import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import type { FeedEvent } from '../types/index.js';

/**
 * In-process event bus for the live feed. Anything that happens worth showing
 * the user — an on-chain event, a task execution — is `publish`ed here. The
 * SSE route subscribes and streams events to connected browsers in real time.
 * Events are also persisted so a newly-connected client can backfill recent
 * activity.
 */
const bus = new EventEmitter();
bus.setMaxListeners(100); // many SSE clients may subscribe

const CHANNEL = 'feed';

const insertStmt = db.prepare(
  `INSERT INTO feed_events (id, type, tx_hash, block_number, payload)
   VALUES (@id, @type, @tx_hash, @block_number, @payload)`,
);

export function publishEvent(input: {
  type: string;
  txHash?: string | null;
  blockNumber?: number | null;
  payload?: Record<string, unknown>;
}): FeedEvent {
  const event: FeedEvent = {
    id: randomUUID(),
    type: input.type,
    tx_hash: input.txHash ?? null,
    block_number: input.blockNumber ?? null,
    payload: input.payload ?? {},
    created_at: new Date().toISOString(),
  };

  insertStmt.run({
    id: event.id,
    type: event.type,
    tx_hash: event.tx_hash,
    block_number: event.block_number,
    payload: JSON.stringify(event.payload),
  });

  bus.emit(CHANNEL, event);
  return event;
}

export function subscribe(listener: (event: FeedEvent) => void): () => void {
  bus.on(CHANNEL, listener);
  return () => bus.off(CHANNEL, listener);
}

/** Most recent events, newest first, for backfilling a fresh SSE connection. */
export function recentEvents(limit = 25): FeedEvent[] {
  const rows = db
    .prepare(`SELECT * FROM feed_events ORDER BY created_at DESC, rowid DESC LIMIT ?`)
    .all(limit) as Array<Omit<FeedEvent, 'payload'> & { payload: string }>;

  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) as Record<string, unknown> }));
}
