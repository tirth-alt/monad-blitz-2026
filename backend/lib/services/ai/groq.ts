import Groq from 'groq-sdk';
import { env } from '../../env';
import { logger } from '../../logger';

let client: Groq | null = null;

function getClient(): Groq {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set');
  if (!client) {
    client = new Groq({ apiKey: env.GROQ_API_KEY });
    logger.info({ model: env.GROQ_MODEL }, 'groq client initialized');
  }
  return client;
}

/** Single-turn chat completion with a system instruction (Groq, free). */
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
  if (!text?.trim()) throw new Error('Groq returned an empty response');
  return text.trim();
}
