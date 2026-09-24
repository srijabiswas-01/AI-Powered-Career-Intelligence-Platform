import { deleteSession, getSessionUser, hashPassword, verifyPassword } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { deleteResumeAsset } from '@/lib/cloudinary';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const [profile, resumes, analyses, tailoredResumes, coverLetters, applications, projects, certificates] = await Promise.all([
    database`select * from profiles where user_id=${user.id}`,
    database`select id,filename,mime_type,size_bytes,content,source_type,builder_snapshot,target_role,job_description,created_at,updated_at from resumes where user_id=${user.id} order by created_at desc`,
    database`select a.* from resume_analyses a join resumes r on r.id=a.resume_id where r.user_id=${user.id} order by a.created_at desc`,
    database`select t.* from tailored_resumes t join resumes r on r.id=t.resume_id where r.user_id=${user.id} order by t.created_at desc`,
    database`select * from cover_letters where user_id=${user.id} order by created_at desc`,
    database`select * from applications where user_id=${user.id} order by created_at desc`,
    database`select * from projects where user_id=${user.id} order by created_at desc`,
    database`select * from certificates where user_id=${user.id} order by created_at desc`,
  ]);
  return Response.json({ exportedAt: new Date().toISOString(), user, profile: profile[0] || {}, resumes, analyses, tailoredResumes, coverLetters, applications, projects, certificates }, { headers: { 'Content-Disposition': 'attachment; filename="careerpilot-data.json"', 'Cache-Control': 'private, no-store' } });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const currentPassword = String(body?.currentPassword || ''), newPassword = String(body?.newPassword || '');
  if (newPassword.length < 8) return apiError('New password must contain at least 8 characters.');
  const [account] = await database<{ password_hash: string }[]>`select password_hash from users where id=${user.id}`;
  if (!account || !verifyPassword(currentPassword, account.password_hash)) return apiError('Current password is incorrect.', 401);
  await database`update users set password_hash=${hashPassword(newPassword)},updated_at=now() where id=${user.id}`;
  await database`delete from sessions where user_id=${user.id}`;
  await deleteSession();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const [account] = await database<{ password_hash: string }[]>`select password_hash from users where id=${user.id}`;
  if (!account || !verifyPassword(String(body?.password || ''), account.password_hash)) return apiError('Password is incorrect.', 401);
  const assets = await database<{ storage_public_id: string | null }[]>`select storage_public_id from resumes where user_id=${user.id} and storage_public_id is not null`;
  try {
    await Promise.all(assets.map(asset => asset.storage_public_id ? deleteResumeAsset(asset.storage_public_id) : Promise.resolve()));
  } catch (error) {
    console.error('Account asset deletion failed', error);
    return apiError('Account deletion stopped because stored resume files could not be removed. Please try again.', 502);
  }
  await database`delete from users where id=${user.id}`;
  await deleteSession();
  return Response.json({ ok: true });
}
