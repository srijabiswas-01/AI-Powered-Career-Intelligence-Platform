import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const [resume] = await database<{ filename: string; mime_type: string; storage_url: string | null; file_data: Buffer | null }[]>`
    select filename, mime_type, storage_url, file_data from resumes where id = ${id} and user_id = ${user.id}
  `;
  if (!resume) return apiError('Resume file not found.', 404);
  let body: BodyInit;
  if (resume.file_data) body = new Uint8Array(resume.file_data);
  else if (resume.storage_url) {
    const source = await fetch(resume.storage_url);
    if (!source.ok || !source.body) return apiError('This older file is blocked by Cloudinary. Delete and re-upload it once.', 409);
    body = source.body;
  } else return apiError('Resume file not found.', 404);
  const encoded = encodeURIComponent(resume.filename).replace(/['()]/g, escape);
  return new Response(body, {
    headers: {
      'Content-Type': resume.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
