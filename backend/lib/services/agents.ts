import { query, queryOne, run } from '../db';
import { env } from '../env';
import { AppError, Conflict, NotFound } from '../errors';
import { DEFAULT_AGENT_RELIABILITY, type Agent, type Category } from '../types';

interface AgentRow extends Omit<Agent, 'tags'> {
  tags: string;
}

const normalize = (addr: string) => addr.toLowerCase();

function rowToAgent(row: AgentRow): Agent {
  return { ...row, tags: JSON.parse(row.tags) as string[] };
}

export function isEligible(agent: Agent): boolean {
  return agent.reliability >= env.RELIABILITY_THRESHOLD;
}

export function assertEligible(agent: Agent): void {
  if (!isEligible(agent)) {
    throw new AppError(
      403,
      'BELOW_RELIABILITY_THRESHOLD',
      `${agent.name} has reliability ${agent.reliability.toFixed(1)}/10, below the ${env.RELIABILITY_THRESHOLD}/10 threshold required to take tasks`,
      { reliability: agent.reliability, threshold: env.RELIABILITY_THRESHOLD },
    );
  }
}

export async function listAgents(): Promise<Agent[]> {
  const rows = await query<AgentRow>('SELECT * FROM agents ORDER BY reliability DESC, created_at ASC');
  return rows.map(rowToAgent);
}

export async function findAgent(address: string): Promise<Agent | null> {
  const row = await queryOne<AgentRow>('SELECT * FROM agents WHERE address = ?', [normalize(address)]);
  return row ? rowToAgent(row) : null;
}

export async function getAgent(address: string): Promise<Agent> {
  const agent = await findAgent(address);
  if (!agent) throw NotFound(`Agent ${address} not found`);
  return agent;
}

interface AgentInput {
  address: string;
  name: string;
  description?: string;
  category: Category;
  reliability?: number;
  tags?: string[];
  persona?: string;
}

export async function createAgent(input: AgentInput): Promise<Agent> {
  const address = normalize(input.address);
  if (await findAgent(address)) throw Conflict(`Agent ${address} already exists`);
  return upsertAgent({ ...input, address });
}

export async function upsertAgent(input: AgentInput): Promise<Agent> {
  const address = normalize(input.address);
  await run(
    `INSERT INTO agents (address, name, description, category, reliability, tags, persona)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(address) DO UPDATE SET
       name=excluded.name, description=excluded.description, category=excluded.category,
       reliability=excluded.reliability, tags=excluded.tags, persona=excluded.persona`,
    [
      address,
      input.name,
      input.description ?? '',
      input.category,
      input.reliability ?? DEFAULT_AGENT_RELIABILITY,
      JSON.stringify(input.tags ?? []),
      input.persona ?? '',
    ],
  );
  return getAgent(address);
}
