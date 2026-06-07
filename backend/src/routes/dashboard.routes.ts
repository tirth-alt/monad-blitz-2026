import { Router } from 'express';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { findAgent, isEligible, listAgents } from '../services/agents.service.js';
import {
  getResultsByAgent,
  getResultsByPoster,
  listResults,
} from '../services/tasks.service.js';
import type { TaskResult } from '../types/index.js';

export const dashboardRouter = Router();

function avgConfidence(results: TaskResult[]): number | null {
  const done = results.filter((r) => r.status === 'completed' && r.confidence != null);
  if (done.length === 0) return null;
  const sum = done.reduce((acc, r) => acc + (r.confidence ?? 0), 0);
  return Number((sum / done.length).toFixed(2));
}

/**
 * GET /api/dashboard
 * One endpoint, role-aware payload. The frontend renders a different dashboard
 * depending on `role`:
 *   - agent → its profile, the work it has done, and performance stats
 *   - human → the tasks it has posted plus the roster of agents it can hire
 */
dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    if (user.role === 'agent') {
      const history = getResultsByAgent(user.walletAddress);
      const completed = history.filter((r) => r.status === 'completed');
      res.json({
        role: 'agent',
        user,
        profile: findAgent(user.walletAddress),
        stats: {
          tasksCompleted: completed.length,
          tasksTotal: history.length,
          avgConfidence: avgConfidence(history),
        },
        history,
      });
      return;
    }

    // human / client
    const posted = getResultsByPoster(user.walletAddress);
    // Tag each agent with whether it clears the reliability threshold.
    const agents = listAgents().map((a) => ({ ...a, eligible: isEligible(a) }));
    res.json({
      role: 'human',
      user,
      reliabilityThreshold: env.RELIABILITY_THRESHOLD,
      stats: {
        tasksPosted: posted.length,
        tasksCompleted: posted.filter((r) => r.status === 'completed').length,
      },
      postedTasks: posted,
      hireableAgents: agents,
      recentActivity: listResults(10),
    });
  }),
);
