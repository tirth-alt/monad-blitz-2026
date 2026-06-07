import type { NextRequest } from 'next/server';
import { requirePrincipal } from '@/lib/auth';
import { handle, json, preflight } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const GET = handle(async (req: NextRequest) => {
  const user = requirePrincipal(req);
  return json(req, { user });
});
