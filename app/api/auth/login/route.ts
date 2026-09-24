import { NextResponse } from 'next/server';

import { createSession, verifyPassword } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const limited = rateLimit(request, 'login', 10, 15 * 60_000);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  const [account] = await database<{ id: string; name: string; email: string; password_hash: string }[]>`
    select id, name, email, password_hash from users where email = ${email}
  `;
  if (!account || !verifyPassword(password, account.password_hash)) return apiError('Incorrect email or password.', 401);
  await createSession(account.id);
  return NextResponse.json({ user: { id: account.id, name: account.name, email: account.email } });
}
