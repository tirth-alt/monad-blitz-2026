import type { Category } from '../types/index.js';
import { upsertAgent } from './agents.service.js';
import { upsertUser } from './users.service.js';

/**
 * The three demo agents from the PRD demo script. Addresses are deterministic
 * placeholders — Person 1 will replace them with the real on-chain registered
 * addresses, but these let the backend and frontend work end-to-end immediately.
 */
export const SEED_AGENTS: Array<{
  address: string;
  name: string;
  description: string;
  category: Category;
  reliability: number;
  tags: string[];
  persona: string;
}> = [
  {
    address: '0x00000000000000000000000000000000000000a1',
    name: 'DataBot-7',
    description: 'High-reputation research agent specializing in market and tech trend briefs.',
    category: 'research',
    reliability: 9.2, // above the 8.0 threshold
    tags: ['research', 'trends', 'web3', 'summarization'],
    persona: 'Confident, data-driven, always cites the strongest signal first.',
  },
  {
    address: '0x00000000000000000000000000000000000000b2',
    name: 'ResearchBot-3',
    description: 'Analytical agent that breaks down complex problems into risks and trade-offs.',
    category: 'analysis',
    reliability: 8.7,
    tags: ['analysis', 'risk', 'strategy'],
    persona: 'Methodical and skeptical; never overstates certainty.',
  },
  {
    address: '0x00000000000000000000000000000000000000c3',
    name: 'WriterAgent-12',
    description: 'Creative writing agent producing polished, engaging copy on demand.',
    category: 'writing',
    reliability: 8.4,
    tags: ['writing', 'copy', 'marketing'],
    persona: 'Punchy, vivid, and economical with words.',
  },
];

/**
 * Hardcoded login accounts for the demo: one agent, one human.
 * "Demo agent" is also registered as a real, executable agent so it can run
 * tasks; "demo human" is a client who posts tasks.
 */
export const TIRTH_AGENT_ADDRESS = '0x00000000000000000000000000000000000000e5';
export const TIRTH_HUMAN_ADDRESS = '0x00000000000000000000000000000000000000d4';

export function seedAgents() {
  // Demo agents (also given agent-role user accounts so they can log in).
  const agents = SEED_AGENTS.map((a) => {
    const agent = upsertAgent(a);
    upsertUser({ walletAddress: a.address, role: 'agent', displayName: a.name });
    return agent;
  });

  // Demo agent — a real executable agent + login account.
  const tirthAgent = upsertAgent({
    address: TIRTH_AGENT_ADDRESS,
    name: 'Demo agent',
    description: 'Demo research agent for the walkthrough.',
    category: 'research',
    reliability: 8.9, // above the 8.0 threshold
    tags: ['research', 'demo'],
    persona: 'Friendly and thorough; explains its reasoning clearly.',
  });
  upsertUser({ walletAddress: TIRTH_AGENT_ADDRESS, role: 'agent', displayName: 'Demo agent' });

  // Demo human — a client login account.
  const tirthHuman = upsertUser({
    walletAddress: TIRTH_HUMAN_ADDRESS,
    role: 'human',
    displayName: 'demo human',
  });

  return { agents: [...agents, tirthAgent], users: [tirthHuman] };
}
