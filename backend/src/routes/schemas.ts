import { z } from 'zod';
import { CATEGORIES, ROLES } from '../types/index.js';

/** EVM address (0x + 40 hex). */
export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid 0x EVM address');

export const categorySchema = z.enum(CATEGORIES);
export const roleSchema = z.enum(ROLES);

export const loginSchema = z.object({
  walletAddress: addressSchema,
  role: roleSchema,
});

export const registerSchema = z
  .object({
    walletAddress: addressSchema,
    role: roleSchema,
    displayName: z.string().min(1).max(60),
    // agent-only fields (reliability is intentionally NOT accepted — new agents
    // always start below the threshold and must prove themselves)
    category: categorySchema.optional(),
    description: z.string().max(500).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    persona: z.string().max(500).optional(),
  })
  .refine((d) => d.role !== 'agent' || Boolean(d.category), {
    message: 'category is required when registering as an agent',
    path: ['category'],
  });

export const createAgentSchema = z.object({
  address: addressSchema,
  name: z.string().min(1).max(60),
  description: z.string().max(500).optional(),
  category: categorySchema,
  reliability: z.number().min(0).max(10).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  persona: z.string().max(500).optional(),
});

export const executeTaskSchema = z.object({
  taskId: z.string().min(1).max(80),
  agentAddress: addressSchema,
  description: z.string().min(3).max(4000),
  // category is optional — defaults to the agent's own category if omitted
  category: categorySchema.optional(),
  // wallet of the human posting the task (optional; also inferred from auth token)
  postedBy: addressSchema.optional(),
});

export const delegateSchema = z.object({
  parentTaskId: z.string().min(1).max(80),
  fromAgent: addressSchema,
  toAgent: addressSchema,
  subtask: z.string().min(3).max(4000),
});

export const addressParamSchema = z.object({ address: addressSchema });
export const taskIdParamSchema = z.object({ taskId: z.string().min(1).max(80) });
