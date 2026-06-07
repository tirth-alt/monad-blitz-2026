import { randomUUID } from 'node:crypto';
import { keccak256, toHex } from 'viem';
import { query, queryOne, run } from '../db';
import { NotFound } from '../errors';
import type { Category, TaskResult } from '../types';

/** keccak256 of the result text — anchored on-chain by completeTask. */
export function hashResult(summary: string): `0x${string}` {
  return keccak256(toHex(summary));
}

export async function getResult(id: string): Promise<TaskResult> {
  const row = await queryOne<TaskResult>('SELECT * FROM task_results WHERE id = ?', [id]);
  if (!row) throw NotFound(`Task result ${id} not found`);
  return row;
}

export async function createPendingResult(input: {
  taskId: string;
  agentAddress: string;
  category: Category;
  prompt: string;
  postedBy?: string | null;
}): Promise<TaskResult> {
  const id = randomUUID();
  await run(
    `INSERT INTO task_results (id, task_id, agent_address, posted_by, category, prompt, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id,
      input.taskId,
      input.agentAddress.toLowerCase(),
      input.postedBy ? input.postedBy.toLowerCase() : null,
      input.category,
      input.prompt,
    ],
  );
  return getResult(id);
}

export async function completeResult(
  id: string,
  data: { summary: string; confidence: number; executionTimeMs: number; model: string },
): Promise<TaskResult> {
  await run(
    `UPDATE task_results
       SET summary=?, confidence=?, execution_time_ms=?, model=?, result_hash=?, status='completed', error=NULL
     WHERE id=?`,
    [data.summary, data.confidence, data.executionTimeMs, data.model, hashResult(data.summary), id],
  );
  return getResult(id);
}

export async function failResult(id: string, error: string): Promise<TaskResult> {
  await run(`UPDATE task_results SET status='failed', error=? WHERE id=?`, [error, id]);
  return getResult(id);
}

export async function getResultsByTask(taskId: string): Promise<TaskResult[]> {
  return query<TaskResult>('SELECT * FROM task_results WHERE task_id = ? ORDER BY created_at DESC', [taskId]);
}

export async function getResultsByAgent(agentAddress: string): Promise<TaskResult[]> {
  return query<TaskResult>('SELECT * FROM task_results WHERE agent_address = ? ORDER BY created_at DESC', [
    agentAddress.toLowerCase(),
  ]);
}

export async function getResultsByPoster(walletAddress: string): Promise<TaskResult[]> {
  return query<TaskResult>('SELECT * FROM task_results WHERE posted_by = ? ORDER BY created_at DESC', [
    walletAddress.toLowerCase(),
  ]);
}

export async function listResults(limit = 50): Promise<TaskResult[]> {
  return query<TaskResult>('SELECT * FROM task_results ORDER BY created_at DESC LIMIT ?', [limit]);
}
