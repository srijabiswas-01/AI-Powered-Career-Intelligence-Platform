import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

const text = (value: unknown, maximum = 500) => String(value ?? '').trim().slice(0, maximum);
const date = (value: unknown) => { const parsed = text(value, 10); return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : null; };
const url = (value: unknown) => { const parsed = text(value, 500); return parsed && /^https?:\/\//i.test(parsed) ? parsed : null; };
const fields = `id,name,issuer,issued_at,credential_url,credential_id,expires_at,skills,include_in_cv,created_at`;

export async function GET() {
	const user = await getSessionUser();
	if (!user) return apiError('Authentication required.', 401);
	return NextResponse.json({ items: await database`select ${database.unsafe(fields)} from certificates where user_id=${user.id} order by created_at desc` });
}

export async function POST(request: Request) {
	const user = await getSessionUser();
	if (!user) return apiError('Authentication required.', 401);
	const body = await request.json().catch(() => null);
	const name = text(body?.name, 180), issuer = text(body?.issuer, 180), issuedAt = date(body?.issuedAt), expiresAt = date(body?.expiresAt);
	if (!name || !issuer) return apiError('Certificate name and issuer are required.');
	if (issuedAt && expiresAt && expiresAt < issuedAt) return apiError('Expiry date cannot be before the issue date.');
	const [item] = await database`
		insert into certificates(user_id,name,issuer,issued_at,credential_url,credential_id,expires_at,skills,include_in_cv)
		values(${user.id},${name},${issuer},${issuedAt},${url(body?.url)},${text(body?.credentialId, 180) || null},${expiresAt},${text(body?.skills, 500) || null},${body?.includeInCv !== false})
		returning id,name,issuer,issued_at,credential_url,credential_id,expires_at,skills,include_in_cv,created_at`;
	return NextResponse.json({ item }, { status: 201 });
}
