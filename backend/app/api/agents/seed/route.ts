import type { NextRequest } from 'next/server';
import { handle, json, preflight } from '@/lib/http';
import { publishEvent } from '@/lib/services/feed';
import { seedAll } from '@/lib/services/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const POST = handle(async (req: NextRequest) => {
  const { agents, users } = await seedAll();
  await publishEvent({ type: 'AgentsSeeded', payload: { agents: agents.length, users: users.length } });
  return json(req, { agents, users }, 201);
});
