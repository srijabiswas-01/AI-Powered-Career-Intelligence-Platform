import { NextResponse } from 'next/server';

import { generateCareerAdvice } from '@/lib/ai';
import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError, isEmail } from '@/lib/http';

export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const jobTitle = String(body?.jobTitle || '').trim();
  const company = String(body?.company || '').trim();
  const jobDescription = String(body?.jobDescription || '').trim();
  const hrName = String(body?.hrName || '').trim();
  const hrEmail = String(body?.hrEmail || '').trim();
  if (!jobTitle || !company || !jobDescription) return apiError('Job title, company, and job description are required.');
  if (hrEmail && !isEmail(hrEmail)) return apiError('Enter a valid HR email address.');
  const [resume] = await database<{ content: string | null }[]>`select content from resumes where id=${id} and user_id=${user.id}`;
  if (!resume?.content) return apiError('Resume text is unavailable.', 422);
  try {
    const generated = await generateCareerAdvice([
      { role: 'system', content: 'Create a professional job application package grounded strictly in the supplied resume. Never invent skills, experience, employers, education, dates, projects, or achievements. Return only valid JSON with string fields coverLetter, emailSubject, and emailBody. The cover letter must be polished, specific, ATS-friendly, 300-450 words, and ready to send. The email must be concise and mention the attached resume and cover letter.' },
      { role: 'user', content: `Candidate: ${user.name}\nRole: ${jobTitle}\nCompany: ${company}\nHR contact: ${hrName || 'Hiring Manager'}${hrEmail ? ` <${hrEmail}>` : ''}\n\nJob description:\n${jobDescription.slice(0,12000)}\n\nResume:\n${resume.content.slice(0,18000)}` },
    ]);
    const cleaned = generated.text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
    const output = JSON.parse(cleaned) as { coverLetter?: string; emailSubject?: string; emailBody?: string };
    if (!output.coverLetter || !output.emailSubject || !output.emailBody) throw new Error('Incomplete AI response');
    const [letter] = await database<{ id:string; created_at:Date }[]>`
      insert into cover_letters (resume_id,job_title,company,hr_name,hr_email,cover_letter,email_subject,email_body,provider)
      values (${id},${jobTitle},${company},${hrName||null},${hrEmail||null},${output.coverLetter},${output.emailSubject},${output.emailBody},${generated.provider}) returning id,created_at
    `;
    return NextResponse.json({ coverLetter: { ...letter, ...output, jobTitle, company, hrName, hrEmail, filename: `${company}_${jobTitle}_Cover_Letter.docx`.replace(/[^a-z0-9._-]+/gi,'_') } }, { status: 201 });
  } catch (error) {
    console.error('Cover letter generation failed', error);
    return apiError('Cover letter generation is temporarily unavailable.', 503);
  }
}
