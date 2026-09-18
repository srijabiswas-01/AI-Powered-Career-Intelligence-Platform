import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
	const user = await getSessionUser();
	if (!user) return apiError('Authentication required.', 401);
	const [profile] = await database`
		select headline,location,phone,bio,summary,job_title,avatar_data_url,skills,skills_json,experience_json,education_json,
			languages_json,links_json,achievements_json,publications_json,hobbies_json
		from profiles where user_id=${user.id}
	`;
	const projects = await database`
		select id,title,description,technologies,project_url,role,start_date,end_date,outcomes
		from projects where user_id=${user.id} and include_in_cv=true order by created_at desc
	`;
	const certificates = await database`
		select id,name,issuer,issued_at,credential_url,credential_id,expires_at,skills
		from certificates where user_id=${user.id} and include_in_cv=true order by issued_at desc nulls last, created_at desc
	`;
	return NextResponse.json({ user, profile: profile || {}, projects, certificates });
}
