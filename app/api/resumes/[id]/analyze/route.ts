import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { analyzeResumeText } from '@/lib/ats';
import { reviewResumeWithAI } from '@/lib/ai';
import { sanitizeKeywordList } from '@/lib/job-keywords';

export const maxDuration = 60;
export const runtime = 'nodejs';

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
  if (!resume.content || resume.content.length < 80) return apiError('Readable resume text is unavailable. Upload a text-based PDF, DOCX, or clearer scan.', 422);
  let strengths = result.strengths, improvements = result.improvements, keywords = result.keywords, provider = 'heuristic';
  try {
    const review = await reviewResumeWithAI(resume.content, jobDescription);
    strengths = review.strengths; improvements = review.improvements; keywords = sanitizeKeywordList(review.keywords, 16); provider = review.provider;
  } catch (error) {
    console.warn('AI resume review failed; using heuristic fallback', error);
  }
  const [analysis] = await database`
    insert into resume_analyses (resume_id, score, target_role, job_description, strengths, improvements, keywords, provider)
    values (${id}, ${result.score}, ${targetRole || null}, ${jobDescription || null}, ${database.json(strengths)}, ${database.json(improvements)}, ${database.json(keywords)}, ${provider})
    returning id, score, strengths, improvements, keywords, provider, created_at
  `;
  return NextResponse.json({ analysis, analysisMode: provider === 'heuristic' ? 'fallback' : 'ai' }, { status: 201 });
}
