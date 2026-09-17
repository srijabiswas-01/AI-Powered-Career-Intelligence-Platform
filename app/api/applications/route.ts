import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { isApplicationStage } from '@/lib/applications';
import { optionalDate, optionalHttpUrl } from '@/lib/validation';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const applications = await database`
    select id, company, role, stage, location, job_url, applied_at, source, recruiter, follow_up_at, notes, created_at
    from applications where user_id = ${user.id} order by created_at desc
  `;
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const company = String(body?.company ?? '').trim().slice(0, 200);
  const role = String(body?.role ?? '').trim().slice(0, 200);
  const stage = String(body?.stage ?? 'Applied');
  if (!company || !role) return apiError('Company and role are required.');
  if (!isApplicationStage(stage)) return apiError('Invalid application stage.');
  const jobUrl = optionalHttpUrl(body?.jobUrl);
  const appliedAt = optionalDate(body?.appliedAt || new Date().toISOString().slice(0, 10));
  const followUpAt = optionalDate(body?.followUpAt);
  if (jobUrl.error || appliedAt.error || followUpAt.error) return apiError(jobUrl.error || appliedAt.error || followUpAt.error || 'Invalid application data.');
  const [application] = await database`
    insert into applications (user_id, company, role, stage, location, job_url, applied_at, source, recruiter, follow_up_at, notes)
    values (${user.id}, ${company}, ${role}, ${stage}, ${String(body?.location || '').trim().slice(0, 200) || null}, ${jobUrl.value ?? null}, ${appliedAt.value ?? null}, ${String(body?.source || '').trim().slice(0, 100) || null}, ${String(body?.recruiter || '').trim().slice(0, 200) || null}, ${followUpAt.value ?? null}, ${String(body?.notes || '').trim().slice(0, 4_000) || null})
    returning id, company, role, stage, location, job_url, applied_at, source, recruiter, follow_up_at, notes, created_at
  `;
  return NextResponse.json({ application }, { status: 201 });
}
