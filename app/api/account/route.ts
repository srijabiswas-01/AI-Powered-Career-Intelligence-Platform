import { deleteSession, getSessionUser, hashPassword, verifyPassword } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const [profile, resumes, applications, projects, certificates] = await Promise.all([
    database`select * from profiles where user_id=${user.id}`,
    database`select id,filename,mime_type,size_bytes,created_at from resumes where user_id=${user.id} order by created_at desc`,
    database`select * from applications where user_id=${user.id} order by created_at desc`,
    database`select * from projects where user_id=${user.id} order by created_at desc`,
    database`select * from certificates where user_id=${user.id} order by created_at desc`,
  ]);
  return Response.json({ exportedAt: new Date().toISOString(), user, profile: profile[0] || {}, resumes, applications, projects, certificates }, { headers: { 'Content-Disposition': 'attachment; filename="careerpilot-data.json"' } });
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
  await database`delete from users where id=${user.id}`;
  await deleteSession();
  return Response.json({ ok: true });
}
