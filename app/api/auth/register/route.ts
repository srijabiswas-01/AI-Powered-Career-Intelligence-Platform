import { NextResponse } from 'next/server';

import { createSession, hashPassword } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError, isEmail } from '@/lib/http';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  if (name.length < 2) return apiError('Name must contain at least 2 characters.');
  if (!isEmail(email)) return apiError('Enter a valid email address.');
  if (password.length < 8) return apiError('Password must contain at least 8 characters.');
  const existing = await database`select id from users where email = ${email}`;
  if (existing.length) return apiError('An account with this email already exists.', 409);
  const [user] = await database<{ id: string; name: string; email: string }[]>`
    insert into users (name, email, password_hash)
    values (${name}, ${email}, ${hashPassword(password)})
    returning id, name, email
  `;
  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
}

