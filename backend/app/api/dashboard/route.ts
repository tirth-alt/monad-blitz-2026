import type { NextRequest } from 'next/server';
import { requirePrincipal } from '@/lib/auth';
import { env } from '@/lib/env';
import { handle, json, preflight } from '@/lib/http';
import { findAgent, isEligible, listAgents } from '@/lib/services/agents';
import { getResultsByAgent, getResultsByPoster, listResults } from '@/lib/services/tasks';
import type { TaskResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

function avgConfidence(results: TaskResult[]): number | null {
  const done = results.filter((r) => r.status === 'completed' && r.confidence != null);
  if (done.length === 0) return null;
  const sum = done.reduce((acc, r) => acc + (r.confidence ?? 0), 0);
  return Number((sum / done.length).toFixed(2));
}

/** Role-aware dashboard: agent view vs human/client view. */
export const GET = handle(async (req: NextRequest) => {
  const user = requirePrincipal(req);

  if (user.role === 'agent') {
    const history = await getResultsByAgent(user.walletAddress);
    const completed = history.filter((r) => r.status === 'completed');
    return json(req, {
      role: 'agent',
      user,
      profile: await findAgent(user.walletAddress),
      stats: {
        tasksCompleted: completed.length,
        tasksTotal: history.length,
        avgConfidence: avgConfidence(history),
      },
      history,
    });
  }

  const posted = await getResultsByPoster(user.walletAddress);
  const agents = (await listAgents()).map((a) => ({ ...a, eligible: isEligible(a) }));
  return json(req, {
    role: 'human',
    user,
    reliabilityThreshold: env.RELIABILITY_THRESHOLD,
    stats: {
      tasksPosted: posted.length,
      tasksCompleted: posted.filter((r) => r.status === 'completed').length,
    },
    postedTasks: posted,
    hireableAgents: agents,
    recentActivity: await listResults(10),
  });
});
