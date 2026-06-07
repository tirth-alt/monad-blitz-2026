import { randomUUID } from 'node:crypto';
import { keccak256, toHex } from 'viem';
import { db } from '../db/index.js';
import { NotFound } from '../lib/errors.js';
import type { Category, TaskResult } from '../types/index.js';

function rowToResult(row: TaskResult): TaskResult {
  return row;
}

/** keccak256 of the result text — this is what gets anchored on-chain. */
export function hashResult(summary: string): `0x${string}` {
  return keccak256(toHex(summary));
}

export function createPendingResult(input: {
  taskId: string;
  agentAddress: string;
  category: Category;
  prompt: string;
  postedBy?: string | null;
}): TaskResult {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO task_results (id, task_id, agent_address, posted_by, category, prompt, status)
     VALUES (@id, @task_id, @agent_address, @posted_by, @category, @prompt, 'pending')`,
  ).run({
    id,
    task_id: input.taskId,
    agent_address: input.agentAddress.toLowerCase(),
    posted_by: input.postedBy ? input.postedBy.toLowerCase() : null,
    category: input.category,
    prompt: input.prompt,
  });
  return getResult(id);
}

export function completeResult(
  id: string,
  data: {
    summary: string;
    confidence: number;
    executionTimeMs: number;
    model: string;
  },
): TaskResult {
  const resultHash = hashResult(data.summary);
  db.prepare(
    `UPDATE task_results
       SET summary=@summary, confidence=@confidence, execution_time_ms=@execution_time_ms,
           model=@model, result_hash=@result_hash, status='completed', error=NULL
     WHERE id=@id`,
  ).run({
    id,
    summary: data.summary,
    confidence: data.confidence,
    execution_time_ms: data.executionTimeMs,
    model: data.model,
    result_hash: resultHash,
  });
  return getResult(id);
}

export function failResult(id: string, error: string): TaskResult {
  db.prepare(`UPDATE task_results SET status='failed', error=@error WHERE id=@id`).run({
    id,
    error,
  });
  return getResult(id);
}

export function getResult(id: string): TaskResult {
  const row = db.prepare(`SELECT * FROM task_results WHERE id = ?`).get(id) as
    | TaskResult
    | undefined;
  if (!row) throw NotFound(`Task result ${id} not found`);
  return rowToResult(row);
}

export function getResultsByTask(taskId: string): TaskResult[] {
  return db
    .prepare(`SELECT * FROM task_results WHERE task_id = ? ORDER BY created_at DESC`)
    .all(taskId) as TaskResult[];
}

export function getResultsByAgent(agentAddress: string): TaskResult[] {
  return db
    .prepare(`SELECT * FROM task_results WHERE agent_address = ? ORDER BY created_at DESC`)
    .all(agentAddress.toLowerCase()) as TaskResult[];
}

export function getResultsByPoster(walletAddress: string): TaskResult[] {
  return db
    .prepare(`SELECT * FROM task_results WHERE posted_by = ? ORDER BY created_at DESC`)
    .all(walletAddress.toLowerCase()) as TaskResult[];
}

export function listResults(limit = 50): TaskResult[] {
  return db
    .prepare(`SELECT * FROM task_results ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as TaskResult[];
}
