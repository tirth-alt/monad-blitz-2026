import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { run } from '@/lib/db';
import { BadRequest } from '@/lib/errors';
import { handle, json, parseBody, preflight } from '@/lib/http';
import { assertEligible, findAgent } from '@/lib/services/agents';
import { executeTask } from '@/lib/services/ai/executor';
import { publishEvent } from '@/lib/services/feed';
import { completeResult, createPendingResult } from '@/lib/services/tasks';
import { delegateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const OPTIONS = preflight;

/** Agent-to-agent delegation: Agent A hands a subtask to specialist Agent B. */
export const POST = handle(async (req: NextRequest) => {
  const { parentTaskId, fromAgent, toAgent, subtask } = await parseBody(req, delegateSchema);

  const delegator = await findAgent(fromAgent);
  const specialist = await findAgent(toAgent);
  if (!delegator) throw BadRequest(`Delegating agent ${fromAgent} is not registered`);
  if (!specialist) throw BadRequest(`Specialist agent ${toAgent} is not registered`);
  if (delegator.address === specialist.address) throw BadRequest('An agent cannot delegate to itself');
  assertEligible(specialist);

  await publishEvent({
    type: 'TaskDelegated',
    payload: { parentTaskId, from: delegator.name, to: specialist.name, subtask },
  });

  const pending = await createPendingResult({
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
  const result = await completeResult(pending.id, output);

  const delegationId = randomUUID();
  await run(
    `INSERT INTO delegations (id, parent_task_id, from_agent, to_agent, subtask, result_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [delegationId, parentTaskId, delegator.address, specialist.address, subtask, result.id],
  );

  await publishEvent({
    type: 'SubtaskCompleted',
    payload: { parentTaskId, by: specialist.name, resultHash: result.result_hash },
  });

  return json(
    req,
    {
      delegation: { id: delegationId, parentTaskId, from: delegator.name, to: specialist.name },
      result: {
        id: result.id,
        summary: result.summary,
        confidence: result.confidence,
        resultHash: result.result_hash,
        model: result.model,
      },
    },
    201,
  );
});
