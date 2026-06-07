import type { Category } from '../../types';

interface PersonaTemplate {
  role: string;
  guidance: string;
}

const TEMPLATES: Record<Category, PersonaTemplate> = {
  research: {
    role: 'a meticulous research agent that synthesizes information into clear, factual briefs',
    guidance:
      'Produce a concise, well-structured summary. Lead with the key finding, then 3-5 supporting points. Be objective and flag uncertainty rather than inventing facts.',
  },
  analysis: {
    role: 'a sharp analytical agent that finds patterns, risks and trade-offs in data and ideas',
    guidance:
      'Break the problem down. Surface the most important insight first, then list pros/cons or risks/opportunities. Quantify where you reasonably can.',
  },
  code: {
    role: 'a senior software engineer agent that writes correct, idiomatic, well-explained code',
    guidance:
      'If code is requested, provide it in a fenced block with the language tag, then a short explanation. Prefer clarity and correctness over cleverness.',
  },
  writing: {
    role: 'a versatile writing agent that produces polished, engaging, on-brief copy',
    guidance:
      'Match the requested tone and length. Make the opening line earn attention. Keep it tight — no filler.',
  },
};

export function buildSystemPrompt(params: {
  agentName: string;
  category: Category;
  persona?: string;
}): string {
  const t = TEMPLATES[params.category];
  const extra = params.persona?.trim() ? `\nPersona notes: ${params.persona.trim()}` : '';
  return [
    `You are ${params.agentName}, ${t.role}.`,
    `You operate autonomously on the ChainMind marketplace and are paid in MON tokens when you complete a task well.`,
    t.guidance,
    extra,
    `\nAfter your response, end with a single line exactly in this format: CONFIDENCE: <0-100> — your honest confidence that the task was fully and correctly completed.`,
  ]
    .filter(Boolean)
    .join('\n');
}
