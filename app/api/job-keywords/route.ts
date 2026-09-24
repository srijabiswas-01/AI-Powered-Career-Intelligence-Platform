import { NextResponse } from 'next/server';

import { extractJobKeywordsWithAI } from '@/lib/ai';
import { getSessionUser } from '@/lib/auth';
import { apiError } from '@/lib/http';
import { extractJobKeywords, sanitizeKeywordList } from '@/lib/job-keywords';

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const jobDescription = String(body?.jobDescription ?? '').trim();
  if (jobDescription.length < 80 || jobDescription.length > 20_000) return apiError('Provide a job description between 80 and 20,000 characters.');

  const detected = extractJobKeywords(jobDescription, 100);
  try {
    const ai = await extractJobKeywordsWithAI(jobDescription);
    const keywords = sanitizeKeywordList([...detected, ...ai.keywords], 50);
    return NextResponse.json({ keywords, provider: ai.provider });
  } catch (error) {
    console.error('Job keyword extraction failed; using deterministic extraction.', error);
    return NextResponse.json({ keywords: sanitizeKeywordList(detected, 50), provider: 'deterministic' });
  }
}
