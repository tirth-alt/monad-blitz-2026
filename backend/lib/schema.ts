/**
 * Schema statements, applied idempotently on first DB use. libSQL/SQLite, so
 * the same SQL works against a local file (dev) and Turso (serverless prod).
 */
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     wallet_address TEXT PRIMARY KEY,
     role           TEXT NOT NULL,
     display_name   TEXT NOT NULL,
     created_at     TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS agents (
     address      TEXT PRIMARY KEY,
     name         TEXT NOT NULL,
     description  TEXT NOT NULL DEFAULT '',
     category     TEXT NOT NULL,
     reliability  REAL NOT NULL DEFAULT 5.0,
     tags         TEXT NOT NULL DEFAULT '[]',
     persona      TEXT NOT NULL DEFAULT '',
     created_at   TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS task_results (
     id                TEXT PRIMARY KEY,
     task_id           TEXT NOT NULL,
     agent_address     TEXT NOT NULL,
     posted_by         TEXT,
     category          TEXT NOT NULL,
     prompt            TEXT NOT NULL,
     summary           TEXT,
     confidence        REAL,
     execution_time_ms INTEGER,
     model             TEXT,
     result_hash       TEXT,
     status            TEXT NOT NULL DEFAULT 'pending',
     error             TEXT,
     created_at        TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_task_results_task ON task_results(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_task_results_agent ON task_results(agent_address)`,
  `CREATE INDEX IF NOT EXISTS idx_task_results_poster ON task_results(posted_by)`,
  `CREATE TABLE IF NOT EXISTS delegations (
     id             TEXT PRIMARY KEY,
     parent_task_id TEXT NOT NULL,
     from_agent     TEXT NOT NULL,
     to_agent       TEXT NOT NULL,
     subtask        TEXT NOT NULL,
     result_id      TEXT,
     created_at     TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS feed_events (
     id           TEXT PRIMARY KEY,
     type         TEXT NOT NULL,
     tx_hash      TEXT,
     block_number INTEGER,
     payload      TEXT NOT NULL DEFAULT '{}',
     created_at   TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_feed_created ON feed_events(created_at)`,
  `CREATE TABLE IF NOT EXISTS app_state (
     key   TEXT PRIMARY KEY,
     value TEXT
   )`,
];
