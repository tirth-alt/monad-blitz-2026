import type { NextRequest } from 'next/server';
import { handle, json, preflight } from '@/lib/http';
import { listResults } from '@/lib/services/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const OPTIONS = preflight;

export const GET = handle(async (req: NextRequest) => json(req, { results: await listResults(50) }));
