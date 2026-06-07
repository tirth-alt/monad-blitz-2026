import { aiEnabled, env } from '../../env';
import { logger } from '../../logger';
import type { Category, ExecutionOutput } from '../../types';
import { generate } from './groq';
import { buildSystemPrompt } from './personas';

const TIMEOUT_MS = 25_000;

function extractConfidence(raw: string): { summary: string; confidence: number } {
  const match = raw.match(/CONFIDENCE:\s*(\d{1,3})/i);
  let confidence = 0.85;
  let summary = raw;
  if (match?.[1]) {
    confidence = Math.min(100, Math.max(0, Number(match[1]))) / 100;
    summary = raw.slice(0, match.index).trim();
  }
  return { summary, confidence };
}

function mockResult(category: Category, prompt: string): ExecutionOutput {
  const previews: Record<Category, string> = {
    research: `Research brief on "${prompt}":\n\n• Key finding: the topic shows strong upward momentum.\n• Three supporting signals identified across recent sources.\n• Open question flagged for deeper investigation.`,
    analysis: `Analysis of "${prompt}":\n\n• Primary insight: the dominant driver is concentration risk.\n• Pros: scalable, low marginal cost.\n• Cons: regulatory exposure, single point of failure.`,
    code: `Solution for "${prompt}":\n\n\`\`\`ts\nexport function solve(input: string): string {\n  return input.trim();\n}\n\`\`\`\nClear, typed, and easy to extend.`,
    writing: `Draft for "${prompt}":\n\nThe future doesn't wait — and neither should you. Here's the sharpest take on what matters now, written to be read in under a minute.`,
  };
  return { summary: previews[category], confidence: 0.9, executionTimeMs: 350, model: 'mock' };
}

/**
 * Execute a task with the agent's persona. Falls back to a mock result if AI is
 * disabled, errors, or times out — so a live demo never hard-fails.
 */
export async function executeTask(params: {
  agentName: string;
  category: Category;
  persona?: string;
  prompt: string;
}): Promise<ExecutionOutput> {
  if (!aiEnabled) {
    logger.warn('AI disabled (mock mode or no key) — returning mock result');
    return mockResult(params.category, params.prompt);
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const raw = await generate({
      systemPrompt: buildSystemPrompt({
        agentName: params.agentName,
        category: params.category,
        persona: params.persona,
      }),
      userPrompt: params.prompt,
      signal: controller.signal,
    });
    const { summary, confidence } = extractConfidence(raw);
    return { summary, confidence, executionTimeMs: Date.now() - started, model: env.GROQ_MODEL };
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'AI execution failed — falling back to mock');
    return mockResult(params.category, params.prompt);
  } finally {
    clearTimeout(timer);
  }
}
