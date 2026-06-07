import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/**
 * Thin wrapper around the free Groq API (OpenAI-compatible chat completions,
 * running open models like Llama 3.3). Lazily instantiated so the backend boots
 * fine without a key (the executor falls back to mock mode).
 */
let client: Groq | null = null;

function getClient(): Groq {
  if (!env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set');
  }
  if (!client) {
    client = new Groq({ apiKey: env.GROQ_API_KEY });
    logger.info({ model: env.GROQ_MODEL }, 'groq client initialized');
  }
  return client;
}

/**
 * Run a single-turn chat completion with a system instruction.
 * Returns the raw text output.
 */
export async function generate(params: {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}): Promise<string> {
  const completion = await getClient().chat.completions.create(
    {
      model: env.GROQ_MODEL,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    },
    { signal: params.signal },
  );

  const text = completion.choices[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error('Groq returned an empty response');
  }
  return text.trim();
}
