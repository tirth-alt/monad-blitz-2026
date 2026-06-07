import type { NextRequest } from 'next/server';
import { handle, json, parseBody, preflight } from '@/lib/http';
import { createAgent, listAgents } from '@/lib/services/agents';
import { publishEvent } from '@/lib/services/feed';
import { createAgentSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const GET = handle(async (req: NextRequest) => json(req, { agents: await listAgents() }));

export const POST = handle(async (req: NextRequest) => {
  const body = await parseBody(req, createAgentSchema);
  const agent = await createAgent(body);
  await publishEvent({ type: 'AgentRegistered', payload: { address: agent.address, name: agent.name } });
  return json(req, { agent }, 201);
});
