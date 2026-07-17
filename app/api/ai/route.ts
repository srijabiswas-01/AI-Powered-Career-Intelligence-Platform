import { NextResponse } from 'next/server';

import { generateCareerAdvice } from '@/lib/ai';
import { getSessionUser } from '@/lib/auth';
import { apiError } from '@/lib/http';

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const task = String(body?.task ?? '').trim();
  const context = String(body?.context ?? '').trim();
  if (!task || task.length > 500 || context.length > 20_000) return apiError('Provide a valid task and context.');
  try {
    const result = await generateCareerAdvice([
      { role: 'system', content: 'You are Clymbra, a concise career coach. Give factual, actionable advice. Never invent candidate experience.' },
      { role: 'user', content: `${task}\n\nCandidate context:\n${context}` },
    ]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI request failed', error);
    return apiError('AI service is temporarily unavailable.', 503);
  }
}
