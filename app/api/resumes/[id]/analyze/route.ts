import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { analyzeResumeText } from '@/lib/ats';
import { extractResumeKeywordsWithAI } from '@/lib/ai';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const [resume] = await database<{ id: string; content: string | null }[]>`
    select id, content from resumes where id = ${id} and user_id = ${user.id}
  `;
  if (!resume) return apiError('Resume not found.', 404);
  const targetRole = String(body?.targetRole ?? '').trim();
  const jobDescription = String(body?.jobDescription ?? '').trim();
  const result = analyzeResumeText(resume.content ?? '', jobDescription);
  let keywords = result.keywords, provider = 'statistical';
  if (resume.content && !jobDescription) {
    try { const extracted = await extractResumeKeywordsWithAI(resume.content); keywords = extracted.keywords; provider = extracted.provider; }
    catch (error) { console.warn('AI keyword extraction failed; using statistical fallback', error); }
  }
  const [analysis] = await database`
    insert into resume_analyses (resume_id, score, target_role, job_description, strengths, improvements, keywords, provider)
    values (${id}, ${result.score}, ${targetRole || null}, ${jobDescription || null}, ${database.json(result.strengths)}, ${database.json(result.improvements)}, ${database.json(keywords)}, ${provider})
    returning id, score, strengths, improvements, keywords, provider, created_at
  `;
  return NextResponse.json({ analysis }, { status: 201 });
}
