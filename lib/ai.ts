import 'server-only';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

function parseAiJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    let start = -1, endChar = '', depth = 0, inString = false, escaped = false;
    for (let index = 0; index < cleaned.length; index += 1) {
      const char = cleaned[index];
      if (start === -1) {
        if (char === '[' || char === '{') { start = index; endChar = char === '[' ? ']' : '}'; depth = 1; }
        continue;
      }
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (char === cleaned[start]) depth += 1;
      if (char === endChar) depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
    }
    throw new Error(`AI response did not contain valid JSON: ${cleaned.slice(0, 120)}`);
  }
}

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
  const parsed = parseAiJson(result.text);
  if (!Array.isArray(parsed)) throw new Error('AI keyword response was not an array');
  const keywords = [...new Set(parsed.map(value => String(value).trim().toLowerCase()).filter(value => value.length >= 2 && value.length <= 60))].slice(0, 12);
  return { keywords, provider: result.provider };
}

export async function extractJobKeywordsWithAI(jobDescription: string) {
  const result = await generateCareerAdvice([
    {
      role: 'system',
      content: 'Extract ATS keywords explicitly present in the job description. Return only a JSON array of 10 to 50 concise canonical terms. Prioritize required and preferred skills, technologies, frameworks, methods, cloud platforms, domain expertise, deployment practices, collaboration requirements, and explicit qualifications. Preserve meaningful phrases such as Large Language Models (LLMs), Model Context Protocol (MCP), and feature engineering. Exclude employer names, locations, salary, dates, navigation text, calls to apply, promotional copy, article titles, case studies, and generic words such as job, company, role, work, experience, knowledge, performance, or skills. Never infer a term that is absent from the supplied text.',
    },
    { role: 'user', content: jobDescription.slice(0, 18_000) },
  ], { maxTokens: 1800 });
  const parsed = parseAiJson(result.text);
  if (!Array.isArray(parsed)) throw new Error('AI job keyword response was not an array');
  const keywords = [...new Set(parsed.map(value => String(value).trim()).filter(value => value.length >= 2 && value.length <= 80))].slice(0, 50);
  if (!keywords.length) throw new Error('AI job keyword response was empty');
  return { keywords, provider: result.provider };
}

export async function tailorProfessionalSummaryWithAI(input: {
  targetRole: string;
  jobDescription: string;
  currentSummary: string;
  evidence: string;
}) {
  const result = await generateCareerAdvice([
    {
      role: 'system',
      content: 'Write one ATS-friendly professional summary for a resume. Return only the summary as plain text, with no heading, bullets, markdown, quotation marks, or commentary. Use 55 to 90 words in 3 to 4 concise sentences. Align it with the target role and the most important job-description keywords only when supported by the candidate evidence. Preserve truthful qualifications and measurable facts. Do not invent years of experience, employers, tools, achievements, certifications, or domain expertise. Avoid first-person pronouns, keyword stuffing, and generic claims.',
    },
    {
      role: 'user',
      content: `TARGET ROLE:\n${input.targetRole || 'Not specified'}\n\nJOB DESCRIPTION:\n${input.jobDescription.slice(0, 10_000)}\n\nCURRENT SUMMARY:\n${input.currentSummary.slice(0, 2_500)}\n\nCANDIDATE EVIDENCE:\n${input.evidence.slice(0, 10_000)}`,
    },
  ], { maxTokens: 700 });
  const summary = result.text
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = summary.split(/\s+/).filter(Boolean).length;
  if (wordCount < 35 || wordCount > 120) throw new Error('AI professional summary had an invalid length');
  return { summary, provider: result.provider };
}

type ResumeReview = { strengths: string[]; improvements: string[]; keywords: string[] };

export async function reviewResumeWithAI(resumeText: string, jobDescription = '') {
  const result = await generateCareerAdvice([
    { role: 'system', content: 'Review the supplied resume using only its text. Return only valid JSON with arrays named strengths, improvements, and keywords. Give 2-5 specific strengths and 2-5 actionable improvements. Keywords must contain 5-12 skills, tools, methods, or domains explicitly present in the resume. Do not invent facts and do not claim to represent an employer ATS.' },
    { role: 'user', content: `RESUME:\n${resumeText.slice(0, 18_000)}${jobDescription ? `\n\nOPTIONAL JOB DESCRIPTION:\n${jobDescription.slice(0, 10_000)}` : ''}` },
  ], { maxTokens: 1400 });
  const parsed = parseAiJson(result.text) as Partial<ResumeReview>;
  const clean = (value: unknown, limit: number) => Array.isArray(value)
    ? [...new Set(value.map(item => String(item).trim()).filter(item => item.length >= 2 && item.length <= 300))].slice(0, limit)
    : [];
  const review = {
    strengths: clean(parsed.strengths, 5),
    improvements: clean(parsed.improvements, 5),
    keywords: clean(parsed.keywords, 12).map(value => value.toLowerCase()),
  };
  if (!review.strengths.length || !review.improvements.length) throw new Error('AI resume review was incomplete');
  return { ...review, provider: result.provider };
}
