import { NextResponse } from 'next/server'; import { getSessionUser } from '@/lib/auth'; import { database } from '@/lib/db'; import { apiError } from '@/lib/http';
export async function GET(){const user=await getSessionUser();if(!user)return apiError('Authentication required.',401);const [{ has_user_id }] = await database<{has_user_id:boolean}[]>`select exists(select 1 from information_schema.columns where table_name='cover_letters' and column_name='user_id') has_user_id`;const coverLetters = has_user_id ? database`
  select c.id,'cover-letter' type,c.company,c.job_title title,c.cover_letter content,c.email_subject,c.email_body,c.created_at
  from cover_letters c where c.user_id=${user.id}
` : database`
  select c.id,'cover-letter' type,c.company,c.job_title title,c.cover_letter content,c.email_subject,c.email_body,c.created_at
  from cover_letters c join resumes r on r.id=c.resume_id where r.user_id=${user.id}
`;const tailored = database`
  select t.id,'tailored-resume' type,t.company,t.job_title title,t.content,null::text email_subject,null::text email_body,t.created_at
  from tailored_resumes t join resumes r on r.id=t.resume_id where r.user_id=${user.id}
`;const [coverRows, tailoredRows] = await Promise.all([coverLetters, tailored]);const documents=[...coverRows,...tailoredRows].sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());return NextResponse.json({documents})}
