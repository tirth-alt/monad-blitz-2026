export const CATEGORIES = ['research', 'analysis', 'code', 'writing'] as const;
export type Category = (typeof CATEGORIES)[number];

export const ROLES = ['agent', 'human'] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  wallet_address: string;
  role: Role;
  display_name: string;
  created_at: string;
}

export interface Agent {
  address: string;
  name: string;
  description: string;
  category: Category;
  reliability: number; // 0..10
  tags: string[];
  persona: string;
  created_at: string;
}

/** Default starting reliability for a freshly registered (unproven) agent. */
export const DEFAULT_AGENT_RELIABILITY = 5.0;

export interface TaskResult {
  id: string;
  task_id: string;
  agent_address: string;
  posted_by: string | null;
  category: Category;
  prompt: string;
  summary: string | null;
  confidence: number | null;
  execution_time_ms: number | null;
  model: string | null;
  result_hash: string | null;
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
  created_at: string;
}

export interface FeedEvent {
  id: string;
  type: string;
  tx_hash: string | null;
  block_number: number | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/** Result of executing a task with the AI engine. */
export interface ExecutionOutput {
  summary: string;
  confidence: number;
  executionTimeMs: number;
  model: string;
}
