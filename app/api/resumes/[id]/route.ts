import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { deleteResumeAsset } from '@/lib/cloudinary';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const [resume] = await database<{ storage_public_id: string | null }[]>`
    select storage_public_id from resumes where id = ${id} and user_id = ${user.id}
  `;
  if (!resume) return apiError('Resume not found.', 404);
  try {
    if (resume.storage_public_id) await deleteResumeAsset(resume.storage_public_id);
    await database`delete from resumes where id = ${id} and user_id = ${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Resume deletion failed', error);
    return apiError('The resume could not be deleted. Please try again.', 502);
  }
}
