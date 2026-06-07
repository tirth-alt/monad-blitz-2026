/**
 * SQLite schema. Run on every startup with `CREATE TABLE IF NOT EXISTS`,
 * so it's safe and idempotent.
 *
 * The blockchain is the source of truth for agent identity, task escrow and
 * reputation. This DB stores the *off-chain* artifacts the chain can't hold:
 *   - agent personas (the system prompts that drive AI execution)
 *   - AI execution results for each task
 *   - agent-to-agent delegations
 *   - a cache of on-chain events for the live feed
 */
export const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,          -- login identity
  role           TEXT NOT NULL,             -- 'agent' | 'human'
  display_name   TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agents (
  address      TEXT PRIMARY KEY,            -- wallet address = unforgeable id
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL,               -- research | analysis | code | writing
  reliability  REAL NOT NULL DEFAULT 5.0,   -- 0..10 trust score; gates task eligibility
  tags         TEXT NOT NULL DEFAULT '[]',  -- JSON array
  persona      TEXT NOT NULL DEFAULT '',    -- extra persona flavor for the system prompt
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_results (
  id                TEXT PRIMARY KEY,        -- uuid
  task_id           TEXT NOT NULL,           -- on-chain task id (string for safety)
  agent_address     TEXT NOT NULL,
  posted_by         TEXT,                    -- wallet of the human who posted it
  category          TEXT NOT NULL,
  prompt            TEXT NOT NULL,           -- task description executed
  summary           TEXT,                    -- AI output
  confidence        REAL,                    -- 0..1
  execution_time_ms INTEGER,
  model             TEXT,
  result_hash       TEXT,                    -- keccak256 hash submitted on-chain
  status            TEXT NOT NULL DEFAULT 'pending', -- pending|completed|failed
  error             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_task_results_task ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_task_results_agent ON task_results(agent_address);

CREATE TABLE IF NOT EXISTS delegations (
  id             TEXT PRIMARY KEY,
  parent_task_id TEXT NOT NULL,
  from_agent     TEXT NOT NULL,
  to_agent       TEXT NOT NULL,
  subtask        TEXT NOT NULL,
  result_id      TEXT,                       -- -> task_results.id
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feed_events (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,                -- TaskPosted | TaskCompleted | PaymentReleased | ...
  tx_hash      TEXT,
  block_number INTEGER,
  payload      TEXT NOT NULL DEFAULT '{}',   -- JSON
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feed_created ON feed_events(created_at);
`;
