import { Router } from 'express';
import { aiEnabled, env } from '../config/env.js';
import { agentsRouter } from './agents.routes.js';
import { authRouter } from './auth.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { delegateRouter } from './delegate.routes.js';
import { executeRouter } from './execute.routes.js';
import { feedRouter } from './feed.routes.js';
import { tasksRouter } from './tasks.routes.js';

export const apiRouter = Router();

// Health / readiness — handy for the frontend and for demo sanity checks.
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    ai: aiEnabled ? `groq:${env.GROQ_MODEL}` : 'mock',
    chainListening: Boolean(env.TASK_MARKETPLACE_ADDRESS),
    reliabilityThreshold: env.RELIABILITY_THRESHOLD,
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/agents', agentsRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/execute-task', executeRouter);
apiRouter.use('/delegate', delegateRouter);
apiRouter.use('/feed', feedRouter);
