import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getSessionUser();
	if (!user) return apiError('Authentication required.', 401);
	const { id } = await params;
	const rows = await database`delete from certificates where id=${id} and user_id=${user.id} returning id`;
	return rows.length ? NextResponse.json({ ok: true }) : apiError('Certificate not found.', 404);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getSessionUser();
	if (!user) return apiError('Authentication required.', 401);
	const { id } = await params;
	const body = await request.json().catch(() => null);
	if (typeof body?.includeInCv !== 'boolean') return apiError('A valid CV inclusion value is required.');
	const [item] = await database`update certificates set include_in_cv=${body.includeInCv},updated_at=now() where id=${id} and user_id=${user.id} returning id,include_in_cv`;
	return item ? NextResponse.json({ item }) : apiError('Certificate not found.', 404);
}

