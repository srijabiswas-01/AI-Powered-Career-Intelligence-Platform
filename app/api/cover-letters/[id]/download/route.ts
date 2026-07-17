import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { createProfessionalDocx } from '@/lib/professional-docx';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const [letter] = await database<{ cover_letter:string; company:string; job_title:string }[]>`
    select c.cover_letter,c.company,c.job_title from cover_letters c join resumes r on r.id=c.resume_id where c.id=${id} and r.user_id=${user.id}
  `;
  if (!letter) return apiError('Cover letter not found.', 404);
  const buffer = await createProfessionalDocx({ content: letter.cover_letter, title: 'Cover Letter', subtitle: `${letter.job_title} · ${letter.company}`, documentType: 'cover-letter' });
  const filename = `${letter.company}_${letter.job_title}_Cover_Letter.docx`.replace(/[^a-z0-9._-]+/gi,'_');
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}
