import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  // Security & infra middleware
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(pinoHttp({ logger }));

  // Basic rate limiting to protect the free AI quota from abuse/runaway loops.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 60, // 60 requests/min/IP
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      // SSE stream is long-lived; don't rate-limit the feed.
      skip: (req) => req.path.startsWith('/api/feed/stream'),
    }),
  );

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
