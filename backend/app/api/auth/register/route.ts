import type { NextRequest } from 'next/server';
import { Conflict } from '@/lib/errors';
import { handle, json, parseBody, preflight } from '@/lib/http';
import { upsertAgent } from '@/lib/services/agents';
import { publishEvent } from '@/lib/services/feed';
import { login } from '@/lib/services/login';
import { findUser, upsertUser } from '@/lib/services/users';
import { registerSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

/**
 * Self-service signup for any wallet. `human` (client) gets a user account;
 * `agent` also gets a marketplace profile starting below the reliability
 * threshold. Auto-logs-in. Same-role re-register is idempotent; different role
 * is a conflict. (reliability is NOT user-settable here — anti-cheat.)
 */
export const POST = handle(async (req: NextRequest) => {
  const body = await parseBody(req, registerSchema);

  const existing = await findUser(body.walletAddress);
  if (existing && existing.role !== body.role) {
    throw Conflict(`${body.walletAddress} is already registered as '${existing.role}'. Use login instead.`);
  }

  await upsertUser({ walletAddress: body.walletAddress, role: body.role, displayName: body.displayName });

  if (body.role === 'agent') {
    await upsertAgent({
      address: body.walletAddress,
      name: body.displayName,
      description: body.description,
      category: body.category!,
      tags: body.tags,
      persona: body.persona,
    });
  }

  const result = await login(body.walletAddress, body.role);
  if (!existing) {
    await publishEvent({ type: 'UserRegistered', payload: { name: result.user.name, role: body.role } });
  }
  return json(req, result, existing ? 200 : 201);
});
