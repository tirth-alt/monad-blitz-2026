import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { BadRequest } from '../lib/errors.js';
import { assertEligible, findAgent } from '../services/agents.service.js';
import { executeTask } from '../services/ai/executor.js';
import { completeResult, createPendingResult } from '../services/tasks.service.js';
import { publishEvent } from '../services/feed.js';
import { delegateSchema } from './schemas.js';

export const delegateRouter = Router();

/**
 * POST /api/delegate
 * Agent-to-agent delegation: Agent A hands a subtask to specialist Agent B.
 * B executes it with its own persona, the result is stored and linked to the
 * parent task, and the delegation is recorded so the frontend can draw the
 * collaboration graph.
 */
delegateRouter.post(
  '/',
  validate({ body: delegateSchema }),
  asyncHandler(async (req, res) => {
    const { parentTaskId, fromAgent, toAgent, subtask } = req.body as {
      parentTaskId: string;
      fromAgent: string;
      toAgent: string;
      subtask: string;
    };

    const delegator = findAgent(fromAgent);
    const specialist = findAgent(toAgent);
    if (!delegator) throw BadRequest(`Delegating agent ${fromAgent} is not registered`);
    if (!specialist) throw BadRequest(`Specialist agent ${toAgent} is not registered`);
    if (delegator.address === specialist.address) {
      throw BadRequest('An agent cannot delegate to itself');
    }

    // The specialist that will actually do the work must clear the threshold.
    assertEligible(specialist);

    publishEvent({
      type: 'TaskDelegated',
      payload: { parentTaskId, from: delegator.name, to: specialist.name, subtask },
    });

    // The specialist executes the subtask under its own persona/category.
    const pending = createPendingResult({
      taskId: `${parentTaskId}:sub`,
      agentAddress: specialist.address,
      category: specialist.category,
      prompt: subtask,
    });

    const output = await executeTask({
      agentName: specialist.name,
      category: specialist.category,
      persona: specialist.persona,
      prompt: subtask,
    });
    const result = completeResult(pending.id, output);

    const delegationId = randomUUID();
    db.prepare(
      `INSERT INTO delegations (id, parent_task_id, from_agent, to_agent, subtask, result_id)
       VALUES (@id, @parent_task_id, @from_agent, @to_agent, @subtask, @result_id)`,
    ).run({
      id: delegationId,
      parent_task_id: parentTaskId,
      from_agent: delegator.address,
      to_agent: specialist.address,
      subtask,
      result_id: result.id,
    });

    publishEvent({
      type: 'SubtaskCompleted',
      payload: { parentTaskId, by: specialist.name, resultHash: result.result_hash },
    });

    res.status(201).json({
      delegation: {
        id: delegationId,
        parentTaskId,
        from: delegator.name,
        to: specialist.name,
      },
      result: {
        id: result.id,
        summary: result.summary,
        confidence: result.confidence,
        resultHash: result.result_hash,
        model: result.model,
      },
    });
  }),
);
