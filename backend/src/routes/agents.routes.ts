import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { createAgent, getAgent, listAgents } from '../services/agents.service.js';
import { getResultsByAgent } from '../services/tasks.service.js';
import { seedAgents } from '../services/seed.js';
import { publishEvent } from '../services/feed.js';
import { addressParamSchema, createAgentSchema } from './schemas.js';

export const agentsRouter = Router();

// GET /api/agents — list all agents
agentsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ agents: listAgents() });
  }),
);

// POST /api/agents/seed — (re)create the 3 demo agents
agentsRouter.post(
  '/seed',
  asyncHandler(async (_req, res) => {
    const { agents, users } = seedAgents();
    publishEvent({ type: 'AgentsSeeded', payload: { agents: agents.length, users: users.length } });
    res.status(201).json({ agents, users });
  }),
);

// GET /api/agents/:address — single agent + its task history
agentsRouter.get(
  '/:address',
  validate({ params: addressParamSchema }),
  asyncHandler(async (req, res) => {
    const agent = getAgent(req.params.address as string);
    res.json({ agent, history: getResultsByAgent(agent.address) });
  }),
);

// POST /api/agents — register an agent off-chain (persona + metadata)
agentsRouter.post(
  '/',
  validate({ body: createAgentSchema }),
  asyncHandler(async (req, res) => {
    const agent = createAgent(req.body);
    publishEvent({ type: 'AgentRegistered', payload: { address: agent.address, name: agent.name } });
    res.status(201).json({ agent });
  }),
);
