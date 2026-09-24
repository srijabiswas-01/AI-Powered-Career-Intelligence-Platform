import { tailorProfessionalSummaryWithAI } from '@/lib/ai';
import { getSessionUser } from '@/lib/auth';
import { apiError } from '@/lib/http';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await getSessionUser())) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const jobDescription = String(body?.jobDescription ?? '').trim();
  const currentSummary = String(body?.currentSummary ?? '').trim().slice(0, 2500);
  if (!jobDescription || jobDescription.length > 12000) return apiError('Provide a job description of up to 12,000 characters.');
  try {
    const result = await tailorProfessionalSummaryWithAI({
      targetRole: String(body?.targetRole ?? '').slice(0, 150),
      jobDescription,
      currentSummary,
      evidence: String(body?.evidence ?? '').slice(0, 10000),
    });
    return Response.json(result);
  } catch {
    return apiError('Could not tailor the summary. Your default summary is still available. Try again.', 503);
  }
}
