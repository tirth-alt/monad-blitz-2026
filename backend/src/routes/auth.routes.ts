import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Conflict } from '../lib/errors.js';
import { login } from '../services/auth.service.js';
import { upsertAgent } from '../services/agents.service.js';
import { findUser, upsertUser } from '../services/users.service.js';
import { publishEvent } from '../services/feed.js';
import { loginSchema, registerSchema } from './schemas.js';
import type { Category, Role } from '../types/index.js';

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Self-service signup for any wallet. `human` (client) gets a user account;
 * `agent` also gets a marketplace agent profile (starting below the reliability
 * threshold). Auto-logs-in on success by returning a token. Registering an
 * existing wallet with the SAME role is treated as idempotent (re-issues a
 * token); a different role is a conflict.
 */
authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      walletAddress: string;
      role: Role;
      displayName: string;
      category?: Category;
      description?: string;
      tags?: string[];
      persona?: string;
    };

    const existing = findUser(body.walletAddress);
    if (existing && existing.role !== body.role) {
      throw Conflict(
        `${body.walletAddress} is already registered as '${existing.role}'. Use login instead.`,
      );
    }

    upsertUser({ walletAddress: body.walletAddress, role: body.role, displayName: body.displayName });

    // Agents also need a marketplace profile so they can (eventually) execute.
    if (body.role === 'agent') {
      upsertAgent({
        address: body.walletAddress,
        name: body.displayName,
        description: body.description,
        category: body.category!, // guaranteed by schema refinement
        tags: body.tags,
        persona: body.persona,
        // reliability omitted → defaults below the threshold (must prove itself)
      });
    }

    const result = login(body.walletAddress, body.role);
    if (!existing) {
      publishEvent({ type: 'UserRegistered', payload: { name: result.user.name, role: body.role } });
    }
    res.status(existing ? 200 : 201).json(result);
  }),
);

/**
 * POST /api/auth/login
 * Body: { walletAddress, role }. Returns a signed token + the user principal.
 * The frontend stores the token and sends it as `Authorization: Bearer <token>`.
 */
authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { walletAddress, role } = req.body as { walletAddress: string; role: 'agent' | 'human' };
    const result = login(walletAddress, role);
    publishEvent({ type: 'UserLoggedIn', payload: { name: result.user.name, role } });
    res.json(result);
  }),
);

/**
 * GET /api/auth/me — return the current principal (verifies the token).
 * Frontends use this to restore a session on page load.
 */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);
