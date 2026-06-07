import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { getResultsByTask, listResults } from '../services/tasks.service.js';
import { taskIdParamSchema } from './schemas.js';

export const tasksRouter = Router();

// GET /api/tasks/results — recent execution results across all tasks
tasksRouter.get(
  '/results',
  asyncHandler(async (_req, res) => {
    res.json({ results: listResults(50) });
  }),
);

// GET /api/tasks/:taskId/results — execution results for one on-chain task
tasksRouter.get(
  '/:taskId/results',
  validate({ params: taskIdParamSchema }),
  asyncHandler(async (req, res) => {
    res.json({ results: getResultsByTask(req.params.taskId as string) });
  }),
);
