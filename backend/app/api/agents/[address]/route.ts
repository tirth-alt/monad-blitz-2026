import type { NextRequest } from 'next/server';
import { BadRequest } from '@/lib/errors';
import { handle, json, preflight } from '@/lib/http';
import { getAgent } from '@/lib/services/agents';
import { getResultsByAgent } from '@/lib/services/tasks';
import { addressSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const GET = handle(async (req: NextRequest, ctx) => {
  const { address } = await ctx.params;
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) throw BadRequest('Invalid agent address');
  const agent = await getAgent(parsed.data);
  return json(req, { agent, history: await getResultsByAgent(agent.address) });
});
