import type { NextRequest } from 'next/server';
import { handle, json, preflight } from '@/lib/http';
import { getResultsByTask } from '@/lib/services/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const GET = handle(async (req: NextRequest, ctx) => {
  const { taskId } = await ctx.params;
  return json(req, { results: await getResultsByTask(taskId ?? '') });
});
