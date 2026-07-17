import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { analyzeResumeText, extractStatisticalKeywords } from '@/lib/ats';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

type Job = { id: string; title: string; company: string; location: string; description: string; url: string; source: string; createdAt?: string; matchScore?: number; matchedKeywords?: string[] };

function cleanText(value: unknown) {
  const source = String(value ?? '');
  const named: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
  return source
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      const key = code.toLowerCase();
      if (named[key] !== undefined) return named[key];
      if (key.startsWith('#x')) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
      if (key.startsWith('#')) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
      return entity;
    })
    .replace(/[\u00a0\t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const params = new URL(request.url).searchParams;
  let query = (params.get('q') || 'software engineer').slice(0, 100);
  const location = (params.get('location') || 'India').slice(0, 100);
  const resumeId = params.get('resumeId');
  let resumeKeywords: string[] = [], resumeText = '';
  if (resumeId) {
    const [resume] = await database<{ content: string | null }[]>`select content from resumes where id = ${resumeId} and user_id = ${user.id}`;
    if (!resume) return apiError('Resume not found.', 404);
    resumeText = (resume.content || '').toLowerCase();
    resumeKeywords = analyzeResumeText(resume.content || '').keywords.slice(0, 10);
    if (resumeKeywords.length) query = resumeKeywords.slice(0, 5).join(' ');
  }
  const tasks: Promise<Job[]>[] = [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    const country = process.env.ADZUNA_COUNTRY || 'in';
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.search = new URLSearchParams({ app_id: process.env.ADZUNA_APP_ID, app_key: process.env.ADZUNA_APP_KEY, what: query, where: location, results_per_page: '20', 'content-type': 'application/json' }).toString();
    tasks.push(fetch(url, { signal: AbortSignal.timeout(15_000) }).then(async response => {
      if (!response.ok) throw new Error(`Adzuna ${response.status}`);
      const data = await response.json();
      return (data.results || []).map((job: any) => ({ id: `adzuna:${job.id}`, title: cleanText(job.title), company: cleanText(job.company?.display_name || 'Unknown'), location: cleanText(job.location?.display_name || ''), description: cleanText(job.description || ''), url: job.redirect_url, source: 'Adzuna', createdAt: job.created }));
    }));
  }
  if (process.env.JOOBLE_API_KEY) {
    tasks.push(fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: query, location, page: '1', ResultOnPage: '20' }), signal: AbortSignal.timeout(15_000) }).then(async response => {
      if (!response.ok) throw new Error(`Jooble ${response.status}`);
      const data = await response.json();
      return (data.jobs || []).map((job: any) => ({ id: `jooble:${job.id}`, title: cleanText(job.title), company: cleanText(job.company || 'Unknown'), location: cleanText(job.location || ''), description: cleanText(job.snippet || ''), url: job.link, source: 'Jooble', createdAt: job.updated }));
    }));
  }
  const settled = await Promise.allSettled(tasks);
  const jobs = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []).map(job => {
    if (!resumeKeywords.length) return job;
    const jobKeywords = extractStatisticalKeywords(`${job.title} ${job.description}`, 20, 1);
    const matchedKeywords = jobKeywords.filter(keyword => resumeText.includes(keyword.toLowerCase()));
    const titleTerms = extractStatisticalKeywords(job.title, 5, 1);
    const titleMatches = titleTerms.filter(keyword => resumeText.includes(keyword.toLowerCase())).length;
    const keywordScore = jobKeywords.length ? Math.round(matchedKeywords.length / jobKeywords.length * 85) : 0;
    const titleScore = titleTerms.length ? Math.round(titleMatches / titleTerms.length * 15) : 0;
    const matchScore = Math.min(100, keywordScore + titleScore);
    return { ...job, matchScore, matchedKeywords };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  const providers = settled.map((result, index) => ({ provider: index === 0 && process.env.ADZUNA_APP_ID ? 'Adzuna' : 'Jooble', status: result.status === 'fulfilled' ? 'ok' : 'error' }));
  return NextResponse.json({ jobs, providers, query, resumeKeywords });
}
