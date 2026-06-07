import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { SCHEMA } from './schema.js';

const dbPath = resolve(process.cwd(), env.DATABASE_PATH);

// Ensure the parent directory exists (e.g. ./data).
mkdirSync(dirname(dbPath), { recursive: true });

/**
 * better-sqlite3 is synchronous — perfect for a low-latency hackathon backend.
 * WAL mode gives us concurrent reads while a write is in progress.
 */
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(SCHEMA);

logger.info({ dbPath }, 'sqlite connected & schema ready');

export function closeDb(): void {
  db.close();
}
