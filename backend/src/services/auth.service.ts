import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import type { Role, User } from '../types/index.js';
import { findUser } from './users.service.js';

/** The shape we encode into the JWT and attach to authenticated requests. */
export interface AuthPrincipal {
  walletAddress: string;
  role: Role;
  name: string;
}

export interface LoginResult {
  token: string;
  user: AuthPrincipal;
}

/**
 * Simple wallet+role login: the wallet must already exist as a user with the
 * given role (we seed/provision users elsewhere). No password — the demo trusts
 * that whoever holds the address is that actor. Returns a signed JWT.
 */
export function login(walletAddress: string, role: Role): LoginResult {
  const user = findUser(walletAddress);

  if (!user) {
    throw new AppError(401, 'UNKNOWN_USER', `No user registered for ${walletAddress}`);
  }
  if (user.role !== role) {
    throw new AppError(
      403,
      'ROLE_MISMATCH',
      `${walletAddress} is registered as '${user.role}', not '${role}'`,
    );
  }

  const principal: AuthPrincipal = {
    walletAddress: user.wallet_address,
    role: user.role,
    name: user.display_name,
  };

  const token = jwt.sign(principal, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
  return { token, user: principal };
}

/** Verify a bearer token and return the principal, or throw 401. */
export function verifyToken(token: string): AuthPrincipal {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & AuthPrincipal;
    return { walletAddress: decoded.walletAddress, role: decoded.role, name: decoded.name };
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
}

export function principalFromUser(user: User): AuthPrincipal {
  return { walletAddress: user.wallet_address, role: user.role, name: user.display_name };
}
