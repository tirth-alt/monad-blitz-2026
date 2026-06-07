import type { NextRequest } from 'next/server';
import { handle, json, parseBody, preflight } from '@/lib/http';
import { login } from '@/lib/services/login';
import { publishEvent } from '@/lib/services/feed';
import { loginSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const POST = handle(async (req: NextRequest) => {
  const { walletAddress, role } = await parseBody(req, loginSchema);
  const result = await login(walletAddress, role);
  await publishEvent({ type: 'UserLoggedIn', payload: { name: result.user.name, role } });
  return json(req, result);
});
