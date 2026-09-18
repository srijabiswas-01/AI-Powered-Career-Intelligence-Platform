import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { uploadResume } from '@/lib/cloudinary';
import { analyzeResumeText } from '@/lib/ats';
import { reviewResumeWithAI } from '@/lib/ai';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export const maxDuration = 120;
export const runtime = 'nodejs';
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const rows = await database<Array<ResumeDataRow>>`
    select r.id, r.filename, r.mime_type, r.size_bytes, r.created_at, r.source_type, r.builder_snapshot, r.target_role, r.job_description,
      r.content, left(r.content, 2000) as content_preview,
      a.score, a.strengths, a.improvements, a.keywords, a.provider, a.created_at as analyzed_at
    from resumes r
    left join lateral (
      select * from resume_analyses where resume_id = r.id order by created_at desc limit 1
    ) a on true
    where r.user_id = ${user.id} order by r.created_at desc
  `;
  const resumes = rows.map(({ content, ...resume }) => ({
    ...resume,
    keywords: resume.keywords?.length ? resume.keywords : analyzeResumeText(content || '').keywords,
    ats_breakdown: content ? analyzeResumeText(content).breakdown : [],
    extraction_status: content ? 'ready' : 'failed',
  }));
  return NextResponse.json({ resumes });
}

type ResumeDataRow = {
  id: string; filename: string; mime_type: string; size_bytes: number;
  created_at: Date; content: string | null; content_preview: string | null; score: number | null;
  strengths: string[] | null; improvements: string[] | null; keywords: string[] | null; provider: string | null; analyzed_at: Date | null;
  source_type: 'uploaded' | 'ai_cv_builder'; builder_snapshot: Record<string, unknown> | null; target_role: string | null; job_description: string | null;
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError('Authentication required.', 401);
    const contentType = request.headers.get('content-type') ?? '';
    let filename = '', mimeType = 'text/plain', content = '', size = 0, fileData: Buffer | null = null, storageUrl: string | null = null, storagePublicId: string | null = null;
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return apiError('A resume file is required.');
      if (file.size > MAX_UPLOAD_BYTES) return apiError('Resume must be 4 MB or smaller for web upload.');
      filename = file.name; mimeType = file.type || 'application/octet-stream'; size = file.size;
      const bytes = Buffer.from(await file.arrayBuffer());
      const textFile = new File([bytes], file.name, { type: file.type });
      try {
        const { extractResumeText } = await import('@/lib/resume-text');
        content = await extractResumeText(textFile);
      } catch (error) {
        console.error('Resume text extraction failed', error);
        const reason = error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ').slice(0, 180) : 'Unknown extraction error.';
        return apiError(`The resume was not saved because its text could not be read. ${reason}`, 422);
      }
      const extractedWords = content.match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? [];
      if (content.length < 80 || extractedWords.length < 20) {
        return apiError('The resume was not saved because too little readable text was extracted. Use a text-based PDF, DOCX, or a clearer scan.', 422);
      }
      const storageFile = new File([bytes], file.name, { type: file.type });
      try {
        const stored = await uploadResume(storageFile, user.id);
        storageUrl = stored?.url ?? null; storagePublicId = stored?.publicId ?? null;
      } catch (error) {
        console.error('Resume storage failed', error);
        return apiError('The resume could not be stored. Please try again.', 502);
      }
      // Keep a private database fallback. Cloudinary remains the primary store,
      // but this guarantees that an original can still be downloaded if a raw
      // delivery URL is later blocked by provider settings.
      fileData = bytes;
    } else {
      const body = await request.json().catch(() => null);
      filename = String(body?.filename ?? '').trim(); content = String(body?.content ?? '');
      mimeType = String(body?.mimeType ?? 'text/plain'); size = Buffer.byteLength(content);
    }
    if (!filename) return apiError('Filename is required.');
    const [resume] = await database`
      insert into resumes (user_id, filename, mime_type, size_bytes, content, file_data, storage_url, storage_public_id)
      values (${user.id}, ${filename}, ${mimeType}, ${size}, ${content || null}, ${fileData}, ${storageUrl}, ${storagePublicId})
      returning id, filename, mime_type, size_bytes, created_at
    `;
    const result = analyzeResumeText(content);
    let strengths = result.strengths, improvements = result.improvements, keywords = result.keywords, provider = 'heuristic';
    try {
      const ai = await reviewResumeWithAI(content);
      strengths = ai.strengths; improvements = ai.improvements; keywords = ai.keywords; provider = ai.provider;
    } catch (error) {
      console.warn('AI resume review failed; using heuristic fallback', error);
    }
    const [analysis] = await database`
      insert into resume_analyses (resume_id, score, strengths, improvements, keywords, provider)
      values (${resume.id}, ${result.score}, ${database.json(strengths)}, ${database.json(improvements)}, ${database.json(keywords)}, ${provider})
      returning id, score, strengths, improvements, keywords, provider, created_at
    `;
    return NextResponse.json({ resume, analysis, extractedCharacters: content.length, analysisMode: provider === 'heuristic' ? 'fallback' : 'ai' }, { status: 201 });
  } catch (error) {
    console.error('Resume upload failed', error);
    return apiError('Resume upload failed on the server. Check Vercel logs for the exact cause.', 500);
  }
}
