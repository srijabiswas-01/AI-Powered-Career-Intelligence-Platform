import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { apiError } from '@/lib/http';

export async function GET() {
  const user = await getSessionUser();
  return user ? NextResponse.json({ user }) : apiError('Authentication required.', 401);
}
