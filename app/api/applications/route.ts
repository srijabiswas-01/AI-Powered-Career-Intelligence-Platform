import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const applications = await database`
    select id, company, role, stage, location, job_url, applied_at, created_at
    from applications where user_id = ${user.id} order by created_at desc
  `;
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const company = String(body?.company ?? '').trim();
  const role = String(body?.role ?? '').trim();
  const stage = String(body?.stage ?? 'Applied');
  if (!company || !role) return apiError('Company and role are required.');
  if (!['Applied', 'Interview', 'Offer', 'Rejected'].includes(stage)) return apiError('Invalid application stage.');
  const [application] = await database`
    insert into applications (user_id, company, role, stage, location, job_url, applied_at)
    values (${user.id}, ${company}, ${role}, ${stage}, ${body?.location || null}, ${body?.jobUrl || null}, ${body?.appliedAt || new Date().toISOString().slice(0, 10)})
    returning id, company, role, stage, location, job_url, applied_at, created_at
  `;
  return NextResponse.json({ application }, { status: 201 });
}

