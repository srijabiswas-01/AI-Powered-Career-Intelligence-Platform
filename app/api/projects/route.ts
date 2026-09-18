import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

const text = (value: unknown, maximum = 2500) => String(value ?? '').trim().slice(0, maximum);
const date = (value: unknown) => { const parsed = text(value, 10); return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : null; };
const url = (value: unknown) => { const parsed = text(value, 500); return parsed && /^https?:\/\//i.test(parsed) ? parsed : null; };

const fields = `id,title,description,technologies,project_url,role,start_date,end_date,outcomes,include_in_cv,created_at`;

export async function GET() {
	const user = await getSessionUser();
	if (!user) return apiError('Authentication required.', 401);
	return NextResponse.json({ items: await database`select ${database.unsafe(fields)} from projects where user_id=${user.id} order by created_at desc` });
}

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) return apiError('Authentication required.', 401);
	const body = await request.json().catch(() => null);
	const title = text(body?.title, 180), description = text(body?.description), startDate = date(body?.startDate), endDate = date(body?.endDate);
	if (!title || !description) return apiError('Project title and description are required.');
	if (startDate && endDate && endDate < startDate) return apiError('Project end date cannot be before its start date.');
	const [item] = await database`
		insert into projects(user_id,title,description,technologies,project_url,role,start_date,end_date,outcomes,include_in_cv)
		values(${user.id},${title},${description},${text(body?.technologies, 500) || null},${url(body?.url)},${text(body?.role, 150) || null},${startDate},${endDate},${text(body?.outcomes) || null},${body?.includeInCv !== false})
		returning id,title,description,technologies,project_url,role,start_date,end_date,outcomes,include_in_cv,created_at`;
	return NextResponse.json({ item }, { status: 201 });
}

