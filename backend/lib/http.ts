import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError, BadRequest } from './errors';
import { env, isProd } from './env';
import { logger } from './logger';

/** Build CORS headers, echoing the request origin if it's allowlisted. */
export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = env.CORS_ORIGIN.includes(origin) ? origin : env.CORS_ORIGIN[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** JSON response with CORS headers attached. */
export function json(req: NextRequest, data: unknown, status = 200): NextResponse {
  return NextResponse.json(data as object, { status, headers: corsHeaders(req) });
}

/** Preflight handler — export as `OPTIONS` from any route that needs it. */
export function preflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * Wrap a route handler: runs it, and turns thrown AppError/ZodError/unknown
 * into clean JSON error responses (with CORS). Keeps handlers focused on logic.
 */
export function handle(
  fn: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.statusCode >= 500) logger.error({ err: err.message }, err.message);
        return json(req, { error: { code: err.code, message: err.message, details: err.details } }, err.statusCode);
      }
      if (err instanceof ZodError) {
        return json(
          req,
          { error: { code: 'BAD_REQUEST', message: 'Validation failed', details: err.flatten().fieldErrors } },
          400,
        );
      }
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'unhandled error');
      return json(
        req,
        {
          error: {
            code: 'INTERNAL',
            message: 'Internal server error',
            ...(isProd ? {} : { details: err instanceof Error ? err.message : String(err) }),
          },
        },
        500,
      );
    }
  };
}

/** Parse + validate a JSON request body against a zod schema. */
export async function parseBody<T extends ZodTypeAny>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw BadRequest('Request body must be valid JSON');
  }
  return schema.parse(raw);
}
