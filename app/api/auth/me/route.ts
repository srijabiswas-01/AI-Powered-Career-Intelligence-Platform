import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const [profile] = await database<{ avatar_data_url: string | null }[]>`
    select avatar_data_url from profiles where user_id = ${user.id}
  `;
  return NextResponse.json({
    user: { ...user, avatarDataUrl: profile?.avatar_data_url || '' },
  });
}
