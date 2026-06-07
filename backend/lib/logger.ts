import { isProd } from './env';

/**
 * Minimal structured logger. Avoids pino's worker-thread transport, which is
 * awkward on serverless — plain console with JSON in prod, readable in dev.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, obj: unknown, msg?: string) {
  if (level === 'debug' && isProd) return;
  const line = typeof obj === 'string' ? { msg: obj } : { ...(obj as object), msg };
  const payload = { level, time: new Date().toISOString(), ...line };
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(isProd ? JSON.stringify(payload) : `[${level}] ${msg ?? ''}`, isProd ? '' : line);
}

export const logger = {
  debug: (obj: unknown, msg?: string) => log('debug', obj, msg),
  info: (obj: unknown, msg?: string) => log('info', obj, msg),
  warn: (obj: unknown, msg?: string) => log('warn', obj, msg),
  error: (obj: unknown, msg?: string) => log('error', obj, msg),
};
