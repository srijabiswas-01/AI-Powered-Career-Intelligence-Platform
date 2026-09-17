import { getSessionUser } from '@/lib/auth';
import { fetchResumeAsset } from '@/lib/cloudinary';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const [resume] = await database<{ filename: string; mime_type: string; storage_url: string | null; storage_public_id: string | null; file_data: Buffer | null }[]>`
    select filename, mime_type, storage_url, storage_public_id, file_data from resumes where id = ${id} and user_id = ${user.id}
  `;
  if (!resume) return apiError('Resume file not found.', 404);
  let body: BodyInit;
  if (resume.file_data) body = new Uint8Array(resume.file_data);
  else if (resume.storage_url || resume.storage_public_id) {
    const source = await fetchResumeAsset(resume.storage_url, resume.storage_public_id, resume.filename);
    if (!source) return apiError('The original file is unavailable from storage. Re-upload it to restore downloads.', 409);
    body = source.body!;
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
