import 'server-only';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

async function completion(url: string, key: string, model: string, messages: Message[], maxTokens: number) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.15, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('AI provider returned no content');
  return content;
}

export async function generateCareerAdvice(messages: Message[], options?: { maxTokens?: number }) {
  const maxTokens = Math.min(Math.max(options?.maxTokens || 1800, 500), 4000);
  if (process.env.GROQ_API_KEY) {
    try {
      return { text: await completion('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, process.env.AI_MODEL || 'llama-3.3-70b-versatile', messages, maxTokens), provider: 'groq' };
    } catch (error) {
      if (!process.env.OPENROUTER_API_KEY) throw error;
    }
  }
  if (process.env.OPENROUTER_API_KEY) {
    return { text: await completion('https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, 'meta-llama/llama-3.3-70b-instruct', messages, maxTokens), provider: 'openrouter' };
  }
  throw new Error('No AI provider is configured');
}

export async function extractResumeKeywordsWithAI(resumeText: string) {
  const result = await generateCareerAdvice([
    { role: 'system', content: 'Extract career keywords from resumes. Return only a JSON array of 5 to 12 concise strings. Include only skills, tools, technologies, disciplines, methods, or domain expertise explicitly present in the resume. Do not infer or invent anything. Exclude names, employers, locations, generic adjectives, and section headings.' },
    { role: 'user', content: resumeText.slice(0, 18_000) },
  ]);
  const json = result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('AI keyword response was not an array');
  const keywords = [...new Set(parsed.map(value => String(value).trim().toLowerCase()).filter(value => value.length >= 2 && value.length <= 60))].slice(0, 12);
  return { keywords, provider: result.provider };
}
