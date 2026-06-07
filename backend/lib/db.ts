import { createClient, type Client, type InArgs } from '@libsql/client';
import { env } from './env';
import { logger } from './logger';
import { SCHEMA_STATEMENTS } from './schema';

/**
 * libSQL client. Talks to a local file in dev (`file:./data/...`) and a hosted
 * Turso DB in serverless prod (`libsql://...` + auth token) — same SQL either way.
 *
 * There's no server "startup" on serverless, so the schema is created lazily on
 * first use and memoized per instance via `initPromise`.
 */
let client: Client | null = null;
let initPromise: Promise<Client> | null = null;

async function ensureLocalDir(): Promise<void> {
  if (!env.DATABASE_URL.startsWith('file:')) return;
  // Create the parent directory for a local sqlite file (dev only).
  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  const filePath = env.DATABASE_URL.replace(/^file:/, '');
  await mkdir(dirname(filePath), { recursive: true }).catch(() => {});
}

async function init(): Promise<Client> {
  await ensureLocalDir();
  const c = createClient({
    url: env.DATABASE_URL,
    ...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {}),
  });
  for (const sql of SCHEMA_STATEMENTS) {
    await c.execute(sql);
  }
  logger.info({ url: env.DATABASE_URL.split(':')[0] }, 'libsql connected & schema ready');
  return c;
}

/** Get the initialized client (schema guaranteed). */
export async function getDb(): Promise<Client> {
  if (client) return client;
  if (!initPromise) initPromise = init().then((c) => (client = c));
  return initPromise;
}

type Row = Record<string, unknown>;

/** Run a statement, return all rows as plain objects. */
export async function query<T = Row>(sql: string, args: InArgs = []): Promise<T[]> {
  const db = await getDb();
  const res = await db.execute({ sql, args });
  return res.rows as unknown as T[];
}

/** Run a statement, return the first row or null. */
export async function queryOne<T = Row>(sql: string, args: InArgs = []): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

/** Execute a write statement. */
export async function run(sql: string, args: InArgs = []): Promise<void> {
  const db = await getDb();
  await db.execute({ sql, args });
}
