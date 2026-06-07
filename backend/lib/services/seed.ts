import type { Category } from '../types';
import { upsertAgent } from './agents';
import { upsertUser } from './users';

/** Demo agents from the PRD demo script (placeholder addresses). */
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
    reliability: 9.2,
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

export const TIRTH_AGENT_ADDRESS = '0x00000000000000000000000000000000000000e5';
export const TIRTH_HUMAN_ADDRESS = '0x00000000000000000000000000000000000000d4';

export async function seedAll() {
  const agents = [];
  for (const a of SEED_AGENTS) {
    agents.push(await upsertAgent(a));
    await upsertUser({ walletAddress: a.address, role: 'agent', displayName: a.name });
  }

  // "Demo agent" — a real executable agent + login account.
  const demoAgent = await upsertAgent({
    address: TIRTH_AGENT_ADDRESS,
    name: 'Demo agent',
    description: 'Demo research agent for the walkthrough.',
    category: 'research',
    reliability: 8.9,
    tags: ['research', 'demo'],
    persona: 'Friendly and thorough; explains its reasoning clearly.',
  });
  await upsertUser({ walletAddress: TIRTH_AGENT_ADDRESS, role: 'agent', displayName: 'Demo agent' });
  agents.push(demoAgent);

  // "demo human" — a client login account.
  const demoHuman = await upsertUser({
    walletAddress: TIRTH_HUMAN_ADDRESS,
    role: 'human',
    displayName: 'demo human',
  });

  return { agents, users: [demoHuman] };
}
