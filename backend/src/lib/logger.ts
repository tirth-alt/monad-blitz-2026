import pino from 'pino';
import { env, isProd } from '../config/env.js';

/**
 * Structured logger. Pretty-printed in dev, JSON in prod.
 * Redacts common secret-bearing fields defensively.
 */
export const logger = pino({
  level: isProd ? 'info' : 'debug',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.apiKey', '*.GROQ_API_KEY'],
    censor: '[redacted]',
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});

logger.debug({ NODE_ENV: env.NODE_ENV }, 'logger initialized');
