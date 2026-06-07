import { db } from '../db/index.js';
import { env } from '../config/env.js';
import { AppError, Conflict, NotFound } from '../lib/errors.js';
import { DEFAULT_AGENT_RELIABILITY, type Agent, type Category } from '../types/index.js';

interface AgentRow extends Omit<Agent, 'tags'> {
  tags: string;
}

function rowToAgent(row: AgentRow): Agent {
  return { ...row, tags: JSON.parse(row.tags) as string[] };
}

const normalize = (addr: string) => addr.toLowerCase();

/** Is this agent reliable enough to be assigned/execute tasks? */
export function isEligible(agent: Agent): boolean {
  return agent.reliability >= env.RELIABILITY_THRESHOLD;
}

/** Throw a 403 if the agent is below the marketplace reliability threshold. */
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

export function listAgents(): Agent[] {
  // Highest-reliability first — matches the marketplace "sort by reputation".
  const rows = db
    .prepare(`SELECT * FROM agents ORDER BY reliability DESC, created_at ASC`)
    .all() as AgentRow[];
  return rows.map(rowToAgent);
}

export function getAgent(address: string): Agent {
  const row = db
    .prepare(`SELECT * FROM agents WHERE address = ?`)
    .get(normalize(address)) as AgentRow | undefined;
  if (!row) throw NotFound(`Agent ${address} not found`);
  return rowToAgent(row);
}

export function findAgent(address: string): Agent | null {
  const row = db
    .prepare(`SELECT * FROM agents WHERE address = ?`)
    .get(normalize(address)) as AgentRow | undefined;
  return row ? rowToAgent(row) : null;
}

export function createAgent(input: {
  address: string;
  name: string;
  description?: string;
  category: Category;
  reliability?: number;
  tags?: string[];
  persona?: string;
}): Agent {
  const address = normalize(input.address);
  if (findAgent(address)) throw Conflict(`Agent ${address} already exists`);

  db.prepare(
    `INSERT INTO agents (address, name, description, category, reliability, tags, persona)
     VALUES (@address, @name, @description, @category, @reliability, @tags, @persona)`,
  ).run({
    address,
    name: input.name,
    description: input.description ?? '',
    category: input.category,
    reliability: input.reliability ?? DEFAULT_AGENT_RELIABILITY,
    tags: JSON.stringify(input.tags ?? []),
    persona: input.persona ?? '',
  });

  return getAgent(address);
}

/** Insert-or-replace, used by the seed routine. */
export function upsertAgent(input: {
  address: string;
  name: string;
  description?: string;
  category: Category;
  reliability?: number;
  tags?: string[];
  persona?: string;
}): Agent {
  const address = normalize(input.address);
  db.prepare(
    `INSERT INTO agents (address, name, description, category, reliability, tags, persona)
     VALUES (@address, @name, @description, @category, @reliability, @tags, @persona)
     ON CONFLICT(address) DO UPDATE SET
       name=excluded.name, description=excluded.description,
       category=excluded.category, reliability=excluded.reliability,
       tags=excluded.tags, persona=excluded.persona`,
  ).run({
    address,
    name: input.name,
    description: input.description ?? '',
    category: input.category,
    reliability: input.reliability ?? DEFAULT_AGENT_RELIABILITY,
    tags: JSON.stringify(input.tags ?? []),
    persona: input.persona ?? '',
  });
  return getAgent(address);
}
