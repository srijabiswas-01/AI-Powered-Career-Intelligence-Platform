import { NextResponse } from 'next/server';

import { generateCareerAdvice } from '@/lib/ai';
import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError, isEmail } from '@/lib/http';

export const maxDuration = 60;

const text = (value: unknown) => String(value ?? '').trim();
const namedList = (items: unknown) => Array.isArray(items) ? items.map((item: any) => item?.name).filter(Boolean).join(', ') : '';
const profileLines = (items: unknown, formatter: (item: any) => string) => Array.isArray(items) ? items.map(formatter).filter(Boolean) : [];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const jobTitle = text(body?.jobTitle);
  const company = text(body?.company);
  const jobDescription = text(body?.jobDescription);
  const hrName = text(body?.hrName);
  const hrEmail = text(body?.hrEmail);
  if (!jobTitle || !company || !jobDescription) return apiError('Job title, company, and job description are required.');
  if (hrEmail && !isEmail(hrEmail)) return apiError('Enter a valid HR email address.');

  const [profile] = await database<any[]>`select * from profiles where user_id=${user.id}`;
  const projects = await database<any[]>`select title,description,technologies,role,outcomes,project_url from projects where user_id=${user.id} and include_in_cv=true order by created_at desc limit 12`;
  const certificates = await database<any[]>`select name,issuer,skills,credential_id,credential_url from certificates where user_id=${user.id} and include_in_cv=true order by issued_at desc nulls last, created_at desc limit 12`;
  if (!profile) return apiError('Complete your profile or select a CV before generating a cover letter.', 422);

  const evidence = [
    `Candidate: ${user.name}`,
    `Email: ${user.email}`,
    `Headline: ${profile.headline || profile.job_title || ''}`,
    `Location: ${profile.location || ''}`,
    `Summary: ${profile.summary || profile.bio || ''}`,
    `Skills: ${profileLines(profile.skills_json, (item) => [item.name, item.category].filter(Boolean).join(' - ')).join('; ') || profile.skills || ''}`,
    `Experience: ${profileLines(profile.experience_json, (item) => `${item.title || ''} | ${item.company || ''} | ${item.location || ''} | ${item.description || ''}`).join('\n')}`,
    `Education: ${profileLines(profile.education_json, (item) => `${item.degree || ''} ${item.field || ''} | ${item.institution || ''} | ${item.grade || ''}`).join('\n')}`,
    `Projects: ${projects.map((item) => `${item.title || ''} | ${item.role || ''} | ${item.technologies || ''} | ${item.description || ''} | Outcomes: ${item.outcomes || ''}`).join('\n')}`,
    `Certifications: ${certificates.map((item) => `${item.name || ''} | ${item.issuer || ''} | Skills: ${item.skills || ''} | Credential ID: ${item.credential_id || ''}`).join('\n')}`,
    `Achievements: ${namedList(profile.achievements_json)}`,
    `Publications: ${profileLines(profile.publications_json, (item) => `${item.title || ''} | ${item.type || ''} | ${item.status || ''} | ${item.publisher || ''}`).join('\n')}`,
    `Professional links: ${profileLines(profile.links_json, (item) => `${item.platform || item.label || ''}: ${item.url || ''}`).join(' | ')}`,
  ].filter((line) => !/:\s*$/.test(line)).join('\n');

  try {
    const generated = await generateCareerAdvice([
      { role: 'system', content: 'Create a professional job application package grounded strictly in the supplied candidate profile and portfolio evidence. Never invent skills, experience, employers, education, dates, projects, certifications, achievements, or metrics. Align the strongest truthful evidence to the job description. Return only valid JSON with string fields coverLetter, emailSubject, and emailBody. The cover letter must be polished, specific, ATS-friendly, 300-450 words, and ready to send. The email must be concise and refer to the attached application materials, not an uploaded resume unless one is explicitly supplied.' },
      { role: 'user', content: `Role: ${jobTitle}\nCompany: ${company}\nHR contact: ${hrName || 'Hiring Manager'}${hrEmail ? ` <${hrEmail}>` : ''}\n\nJob description:\n${jobDescription.slice(0, 12000)}\n\nCandidate profile and portfolio evidence:\n${evidence.slice(0, 20000)}` },
    ]);
    const cleaned = generated.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const output = JSON.parse(cleaned) as { coverLetter?: string; emailSubject?: string; emailBody?: string };
    if (!output.coverLetter || !output.emailSubject || !output.emailBody) throw new Error('Incomplete AI response');
    const [letter] = await database<{ id: string; created_at: Date }[]>`
      insert into cover_letters (user_id,resume_id,job_title,company,hr_name,hr_email,cover_letter,email_subject,email_body,provider)
      values (${user.id},null,${jobTitle},${company},${hrName || null},${hrEmail || null},${output.coverLetter},${output.emailSubject},${output.emailBody},${generated.provider}) returning id,created_at
    `;
    return NextResponse.json({ coverLetter: { ...letter, ...output, jobTitle, company, hrName, hrEmail, filename: `${company}_${jobTitle}_Cover_Letter.docx`.replace(/[^a-z0-9._-]+/gi, '_') } }, { status: 201 });
  } catch (error) {
    console.error('Portfolio cover letter generation failed', error);
    return apiError('Cover letter generation is temporarily unavailable.', 503);
  }
}
