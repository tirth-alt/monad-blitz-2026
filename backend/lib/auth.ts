import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { env } from './env';
import { Unauthorized } from './errors';
import type { Role } from './types';

export interface AuthPrincipal {
  walletAddress: string;
  role: Role;
  name: string;
}

export function signToken(principal: AuthPrincipal): string {
  return jwt.sign(principal, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPrincipal {
  try {
    const d = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & AuthPrincipal;
    return { walletAddress: d.walletAddress, role: d.role, name: d.name };
  } catch {
    throw Unauthorized('Invalid or expired token', 'INVALID_TOKEN');
  }
}

function readBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Require a valid token; throws 401 otherwise. */
export function requirePrincipal(req: NextRequest): AuthPrincipal {
  const token = readBearer(req);
  if (!token) throw Unauthorized('Missing Authorization: Bearer <token>', 'NO_TOKEN');
  return verifyToken(token);
}

/** Return the principal if a valid token is present, else null (never throws). */
export function optionalPrincipal(req: NextRequest): AuthPrincipal | null {
  const token = readBearer(req);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
