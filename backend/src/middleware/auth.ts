import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';
import type { Role } from '../types/index.js';
import { verifyToken, type AuthPrincipal } from '../services/auth.service.js';

// Augment Express's Request so handlers can read `req.user` in a typed way.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPrincipal;
    }
  }
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Reject the request unless a valid bearer token is present. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearer(req);
  if (!token) {
    next(new AppError(401, 'NO_TOKEN', 'Missing Authorization: Bearer <token>'));
    return;
  }
  req.user = verifyToken(token);
  next();
}

/** Attach `req.user` if a valid token is present, but never reject. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      /* ignore — treated as anonymous */
    }
  }
  next();
}

/** Require an authenticated user with one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'NO_TOKEN', 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', `Requires role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
}
