import { NextResponse } from 'next/server'; import { getSessionUser } from '@/lib/auth'; import { database } from '@/lib/db'; import { apiError } from '@/lib/http';
export async function GET(){const user=await getSessionUser();if(!user)return apiError('Authentication required.',401);const documents=await database`
  select c.id,'cover-letter' type,c.company,c.job_title title,c.cover_letter content,c.email_subject,c.email_body,c.created_at
  from cover_letters c join resumes r on r.id=c.resume_id where r.user_id=${user.id}
  union all
  select t.id,'tailored-resume' type,t.company,t.job_title title,t.content,null::text email_subject,null::text email_body,t.created_at
  from tailored_resumes t join resumes r on r.id=t.resume_id where r.user_id=${user.id}
  order by created_at desc
`;return NextResponse.json({documents})}
