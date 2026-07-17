import { NextResponse } from 'next/server';

import { generateCareerAdvice } from '@/lib/ai';
import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const title = String(body?.title || '').trim();
  const company = String(body?.company || '').trim();
  const description = String(body?.description || '').trim();
  const jobUrl = String(body?.jobUrl || '').trim();
  if (!title || !company || !description) return apiError('Job title, company, and description are required.');
  const [resume] = await database<{ content: string | null }[]>`select content from resumes where id=${id} and user_id=${user.id}`;
  if (!resume?.content) return apiError('Resume text is unavailable.', 422);
  try {
    const generated = await generateCareerAdvice([
      { role: 'system', content: `You are a senior resume writer and ATS specialist. Create a complete, polished resume tailored to the supplied job using ONLY facts present in SOURCE RESUME.

Accuracy rules:
- Never invent or alter names, contact details, employers, job titles, dates, degrees, institutions, certifications, projects, skills, metrics, or achievements.
- Do not claim a job requirement unless the source resume supports it.
- Preserve all important career history; improve wording, ordering, clarity, and relevance only.
- Integrate relevant job-description terminology naturally where supported by the source.

Required plain-text structure:
1. Candidate's full name on the first line.
2. Existing contact details from the source on the second line. Omit details not present.
3. PROFESSIONAL SUMMARY
4. CORE SKILLS
5. PROFESSIONAL EXPERIENCE (if present)
6. PROJECTS (if present)
7. EDUCATION (if present)
8. CERTIFICATIONS (if present)

Use short ATS-safe section headings and achievement bullets beginning with "- ". Do not use tables, columns, markdown symbols, commentary, placeholders, or a fabricated objective. Return only the complete resume text.` },
      { role: 'user', content: `JOB\nTitle: ${title}\nCompany: ${company}\nDescription:\n${description.slice(0, 12000)}\n\nSOURCE RESUME\n${resume.content.slice(0, 18000)}` },
    ], { maxTokens: 3200 });
    const [tailored] = await database<{ id: string; created_at: Date }[]>`
      insert into tailored_resumes (resume_id, job_title, company, job_url, content, provider)
      values (${id},${title},${company},${jobUrl || null},${generated.text},${generated.provider}) returning id,created_at
    `;
    return NextResponse.json({ tailoredResume: { ...tailored, content: generated.text, provider: generated.provider, filename: `${title.replace(/[^a-z0-9]+/gi,'_')}_Tailored_Resume.docx` } }, { status: 201 });
  } catch (error) {
    console.error('Tailored resume generation failed', error);
    return apiError('Tailored resume generation is temporarily unavailable.', 503);
  }
}
