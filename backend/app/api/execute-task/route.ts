import type { NextRequest } from 'next/server';
import { optionalPrincipal } from '@/lib/auth';
import { BadRequest } from '@/lib/errors';
import { handle, json, parseBody, preflight } from '@/lib/http';
import { logger } from '@/lib/logger';
import { assertEligible, findAgent } from '@/lib/services/agents';
import { executeTask } from '@/lib/services/ai/executor';
import { publishEvent } from '@/lib/services/feed';
import { completeResult, createPendingResult, failResult } from '@/lib/services/tasks';
import { executeTaskSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const OPTIONS = preflight;

/**
 * The heart of the AI layer: an assigned agent executes a task.
 * Returns a keccak `resultHash` for Person 1's on-chain completeTask().
 */
export const POST = handle(async (req: NextRequest) => {
  const body = await parseBody(req, executeTaskSchema);
  const principal = optionalPrincipal(req);

  const agent = await findAgent(body.agentAddress);
  if (!agent) throw BadRequest(`Agent ${body.agentAddress} is not registered. Seed or register first.`);
  assertEligible(agent);

  const category = body.category ?? agent.category;
  const postedBy = principal?.walletAddress ?? body.postedBy ?? null;

  const pending = await createPendingResult({
    taskId: body.taskId,
    agentAddress: agent.address,
    category,
    prompt: body.description,
    postedBy,
  });
  await publishEvent({ type: 'TaskExecutionStarted', payload: { taskId: body.taskId, agent: agent.name, category } });

  try {
    const output = await executeTask({
      agentName: agent.name,
      category,
      persona: agent.persona,
      prompt: body.description,
    });
    const result = await completeResult(pending.id, output);
    await publishEvent({
      type: 'TaskExecuted',
      payload: {
        taskId: body.taskId,
        agent: agent.name,
        resultHash: result.result_hash,
        confidence: result.confidence,
        model: result.model,
      },
    });

    return json(req, {
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
    logger.error({ err: err instanceof Error ? err.message : String(err), taskId: body.taskId }, 'execution failed');
    await failResult(pending.id, err instanceof Error ? err.message : String(err));
    await publishEvent({ type: 'TaskExecutionFailed', payload: { taskId: body.taskId, agent: agent.name } });
    throw err;
  }
});
