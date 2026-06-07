import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { assertEligible, findAgent } from '../services/agents.service.js';
import { executeTask } from '../services/ai/executor.js';
import { completeResult, createPendingResult, failResult } from '../services/tasks.service.js';
import { publishEvent } from '../services/feed.js';
import { BadRequest } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { executeTaskSchema } from './schemas.js';
import type { Category } from '../types/index.js';

export const executeRouter = Router();

/**
 * POST /api/execute-task
 * The heart of the AI layer: an assigned agent executes a task.
 *
 *   1. resolve the agent (for its persona/category)
 *   2. record a pending result
 *   3. run the AI executor (with mock fallback)
 *   4. store the completed result + keccak result hash
 *   5. emit a feed event the frontend/Person 1 can react to
 *
 * The `result_hash` returned is what Person 1's `completeTask(taskId, resultHash)`
 * should submit on-chain to release the escrow.
 */
executeRouter.post(
  '/',
  optionalAuth,
  validate({ body: executeTaskSchema }),
  asyncHandler(async (req, res) => {
    const { taskId, agentAddress, description } = req.body as {
      taskId: string;
      agentAddress: string;
      description: string;
      category?: Category;
      postedBy?: string;
    };

    const agent = findAgent(agentAddress);
    if (!agent) {
      throw BadRequest(
        `Agent ${agentAddress} is not registered. Seed agents or register first.`,
      );
    }

    // Enforce the marketplace reliability threshold (default 8/10).
    assertEligible(agent);

    const category: Category = req.body.category ?? agent.category;
    // Attribute the task to the logged-in human if present, else the body value.
    const postedBy = req.user?.walletAddress ?? req.body.postedBy ?? null;

    const pending = createPendingResult({
      taskId,
      agentAddress: agent.address,
      category,
      prompt: description,
      postedBy,
    });
    publishEvent({
      type: 'TaskExecutionStarted',
      payload: { taskId, agent: agent.name, category },
    });

    try {
      const output = await executeTask({
        agentName: agent.name,
        category,
        persona: agent.persona,
        prompt: description,
      });

      const result = completeResult(pending.id, output);
      publishEvent({
        type: 'TaskExecuted',
        payload: {
          taskId,
          agent: agent.name,
          resultHash: result.result_hash,
          confidence: result.confidence,
          model: result.model,
        },
      });

      res.json({
        result: {
          id: result.id,
          taskId: result.task_id,
          agent: agent.name,
          summary: result.summary,
          confidence: result.confidence,
          executionTimeMs: result.execution_time_ms,
          model: result.model,
          resultHash: result.result_hash,
          status: result.status,
        },
      });
    } catch (err) {
      logger.error({ err, taskId }, 'task execution failed');
      failResult(pending.id, err instanceof Error ? err.message : String(err));
      publishEvent({ type: 'TaskExecutionFailed', payload: { taskId, agent: agent.name } });
      throw err;
    }
  }),
);
