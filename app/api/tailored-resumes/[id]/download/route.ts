import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { createProfessionalDocx } from '@/lib/professional-docx';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(); if (!user) return apiError('Authentication required.', 401);
  const { id } = await context.params;
  const [item] = await database<{ content:string;job_title:string;company:string }[]>`select t.content,t.job_title,t.company from tailored_resumes t join resumes r on r.id=t.resume_id where t.id=${id} and r.user_id=${user.id}`;
  if (!item) return apiError('Tailored resume not found.',404);
  const buffer=await createProfessionalDocx({content:item.content,title:'Tailored Resume',subtitle:`${item.job_title} · ${item.company}`,documentType:'resume'});
  const filename=`${item.company}_${item.job_title}_Tailored_Resume.docx`.replace(/[^a-z0-9._-]+/gi,'_');
  return new Response(new Uint8Array(buffer),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store'}});
}

