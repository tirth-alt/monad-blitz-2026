import { Router } from 'express';
import { recentEvents, subscribe } from '../services/feed.js';
import { logger } from '../lib/logger.js';

export const feedRouter = Router();

/**
 * GET /api/feed/recent — last N feed events (for initial render / polling).
 */
feedRouter.get('/recent', (_req, res) => {
  res.json({ events: recentEvents(25) });
});

/**
 * GET /api/feed/stream — Server-Sent Events stream of live activity.
 *
 * The frontend opens this with `new EventSource('/api/feed/stream')`. We
 * backfill recent events, then push every new event as it's published. A
 * heartbeat comment keeps proxies from closing the idle connection.
 */
feedRouter.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event: { id: string; type: string }) => {
    res.write(`id: ${event.id}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Backfill so a fresh client immediately has context (oldest first).
  for (const e of recentEvents(15).reverse()) send(e);

  const unsubscribe = subscribe(send);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    logger.debug('SSE client disconnected');
  });
});
