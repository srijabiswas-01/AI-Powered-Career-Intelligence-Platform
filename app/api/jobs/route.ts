import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { analyzeResumeText, extractStatisticalKeywords } from '@/lib/ats';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { extractJobKeywords, resumeContainsKeyword } from '@/lib/job-keywords';

type Job = { id: string; title: string; company: string; location: string; description: string; url: string; source: string; createdAt?: string; matchScore?: number; matchedKeywords?: string[] };

const countries: Record<string, string> = {
  au: 'Australia', at: 'Austria', br: 'Brazil', ca: 'Canada', fr: 'France', de: 'Germany',
  in: 'India', it: 'Italy', nl: 'Netherlands', nz: 'New Zealand', pl: 'Poland', sg: 'Singapore',
  za: 'South Africa', gb: 'United Kingdom', us: 'United States',
};

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
  const query = (params.get('q') || '').trim().slice(0, 100);
  const country = (params.get('country') || 'in').trim().toLowerCase();
  const city = (params.get('city') || '').trim().slice(0, 100);
  if (query.length < 2) return apiError('Enter a target role to search for jobs.', 400);
  if (!countries[country]) return apiError('Select a supported country.', 400);
  const countryName = countries[country];
  const location = city || countryName;
  const resumeId = params.get('resumeId');
  let resumeKeywords: string[] = [], resumeText = '';
  if (resumeId) {
    const [resume] = await database<{ content: string | null }[]>`select content from resumes where id = ${resumeId} and user_id = ${user.id}`;
    if (!resume) return apiError('Resume not found.', 404);
    if (!resume.content || resume.content.length < 80) return apiError('This resume has no usable extracted text. Upload a text-based PDF, DOCX, or clearer scan.', 422);
    resumeText = (resume.content || '').toLowerCase();
    resumeKeywords = analyzeResumeText(resume.content || '').keywords.slice(0, 10);
  }
  const tasks: Promise<Job[]>[] = [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.search = new URLSearchParams({ app_id: process.env.ADZUNA_APP_ID, app_key: process.env.ADZUNA_APP_KEY, what: query, where: location, results_per_page: '20', 'content-type': 'application/json' }).toString();
    tasks.push(fetch(url, { signal: AbortSignal.timeout(15_000) }).then(async response => {
      if (!response.ok) throw new Error(`Adzuna ${response.status}`);
      const data = await response.json();
      return (data.results || []).map((job: any) => ({ id: `adzuna:${job.id}`, title: cleanText(job.title), company: cleanText(job.company?.display_name || 'Unknown'), location: cleanText(job.location?.display_name || ''), description: cleanText(job.description || ''), url: job.redirect_url, source: 'Adzuna', createdAt: job.created }));
    }));
  }
  if (process.env.JOOBLE_API_KEY) {
    const joobleLocation = city ? `${city}, ${countryName}` : countryName;
    tasks.push(fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: query, location: joobleLocation, page: '1', ResultOnPage: '20' }), signal: AbortSignal.timeout(15_000) }).then(async response => {
      if (!response.ok) throw new Error(`Jooble ${response.status}`);
      const data = await response.json();
      return (data.jobs || []).map((job: any) => ({ id: `jooble:${job.id}`, title: cleanText(job.title), company: cleanText(job.company || 'Unknown'), location: cleanText(job.location || ''), description: cleanText(job.snippet || ''), url: job.link, source: 'Jooble', createdAt: job.updated }));
    }));
  }
  const settled = await Promise.allSettled(tasks);
  const rankedJobs = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []).map(job => {
    if (!resumeKeywords.length) return job;
    const jobKeywords = extractJobKeywords(`${job.title} ${job.description}`, 40);
    const matchedKeywords = jobKeywords.filter(keyword => resumeContainsKeyword(resumeText, keyword));
    const titleTerms = extractStatisticalKeywords(job.title, 5, 1);
    const titleMatches = titleTerms.filter(keyword => resumeText.includes(keyword.toLowerCase())).length;
    const keywordScore = jobKeywords.length ? Math.round(matchedKeywords.length / jobKeywords.length * 85) : 0;
    const titleScore = titleTerms.length ? Math.round(titleMatches / titleTerms.length * 15) : 0;
    const matchScore = Math.min(100, keywordScore + titleScore);
    return { ...job, matchScore, matchedKeywords };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  const normalizedCity = city.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const jobs = !normalizedCity
    ? rankedJobs
    : rankedJobs.filter(job => {
        const jobLocation = job.location.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        return Boolean(jobLocation) && (jobLocation.includes(normalizedCity) || normalizedCity.includes(jobLocation));
      });
  const providers = settled.map((result, index) => ({ provider: index === 0 && process.env.ADZUNA_APP_ID ? 'Adzuna' : 'Jooble', status: result.status === 'fulfilled' ? 'ok' : 'error' }));
  return NextResponse.json({ jobs, providers, query, country, countryName, city, location: city ? `${city}, ${countryName}` : countryName, resumeKeywords });
}
