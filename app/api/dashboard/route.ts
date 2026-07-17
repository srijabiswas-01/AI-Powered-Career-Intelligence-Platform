import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const period = new URL(request.url).searchParams.get('period') || 'week';
  const now = new Date();
  const since = period === 'all' ? null : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const [stats] = await database`
    select
      (select count(*)::int from resumes where user_id = ${user.id} and (${since}::timestamptz is null or created_at >= ${since})) as resumes,
      (select count(*)::int from applications where user_id = ${user.id} and (${since}::timestamptz is null or created_at >= ${since})) as applications,
      (select count(*)::int from applications where user_id = ${user.id} and stage = 'Interview' and (${since}::timestamptz is null or created_at >= ${since})) as interviews,
      (select round(avg(a.score))::int from resume_analyses a join resumes r on r.id = a.resume_id where r.user_id = ${user.id} and (${since}::timestamptz is null or a.created_at >= ${since})) as average_score
  `;
  const applications = await database`
    select id, company, role, stage, location, applied_at from applications
    where user_id = ${user.id} and (${since}::timestamptz is null or created_at >= ${since}) order by created_at desc limit 10
  `;
  return NextResponse.json({ stats, applications, period, since });
}
