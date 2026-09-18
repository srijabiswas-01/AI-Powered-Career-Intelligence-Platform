import { getSessionUser } from '@/lib/auth';
import { tailorProfessionalSummaryWithAI } from '@/lib/ai';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';
import { createProfessionalDocx } from '@/lib/professional-docx';

export const maxDuration = 60;

const lines = (value: unknown) => String(value ?? '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
const embeddedLink = (label: unknown, url: unknown) => {
  const text = String(label ?? '').replace(/[\[\]]/g, '').trim();
  const rawUrl = String(url ?? '').trim();
  if (!rawUrl) return text;
  const target = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl.replace(/^\/+/, '')}`;
  return `[${text}](${target})`;
};
const month = (value: unknown) => {
  const match = /^(\d{4})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return String(value ?? '');
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
};
async function generateResume(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null;
  const [profile] = await database<any[]>`select * from profiles where user_id=${user.id}`;
  if (!profile) return apiError('Complete your professional profile first.', 422);
  const visible = (items: unknown) => Array.isArray(items) ? items.filter(item => item?.includeInCv !== false) : [];
  const experience = visible(profile.experience_json), education = visible(profile.education_json);
  const skills = visible(profile.skills_json), languages = visible(profile.languages_json);
  const links = visible(profile.links_json), achievements = visible(profile.achievements_json), hobbies = visible(profile.hobbies_json);
  const publications = visible(profile.publications_json);
  const params = new URL(request.url).searchParams;
  const projectIds = Array.isArray(body?.projectIds) ? body.projectIds.map(String) : (params.get('projects') || '').split(',').filter(Boolean);
  const certificateIds = Array.isArray(body?.certificateIds) ? body.certificateIds.map(String) : (params.get('certificates') || '').split(',').filter(Boolean);
  const selectedProjects = new Set(projectIds);
  const selectedCertificates = new Set(certificateIds);
  const targetRole = String(body?.targetRole || params.get('role') || profile.job_title || profile.headline || '').slice(0, 150);
  const jobDescription = String(body?.jobDescription || '').trim().slice(0, 12_000);
  const allProjects = await database<any[]>`select id,title,description,technologies,project_url,role,start_date,end_date,outcomes,include_in_cv from projects where user_id=${user.id} and include_in_cv=true order by created_at desc`;
  const allCertificates = await database<any[]>`select id,name,issuer,issued_at,credential_url,credential_id,expires_at,skills,include_in_cv from certificates where user_id=${user.id} and include_in_cv=true order by issued_at desc nulls last, created_at desc`;
  const projects = Array.isArray(body?.projectIds) || params.has('projects') ? allProjects.filter(item => selectedProjects.has(String(item.id))) : allProjects;
  const certificates = Array.isArray(body?.certificateIds) || params.has('certificates') ? allCertificates.filter(item => selectedCertificates.has(String(item.id))) : allCertificates;
  if (!profile.summary || !skills.length || (!experience.length && !education.length)) return apiError('Add a summary, skills, and experience or education before generating your CV.', 422);
  const preferences = profile.cv_preferences_json || {};
  const contact = [preferences.location === false ? '' : profile.location, preferences.phone === false ? '' : profile.phone, user.email, ...links.map((item: any) => embeddedLink(item.platform === 'Other' ? item.label || 'Professional link' : item.platform || item.label || 'Professional link', item.url))].filter(Boolean).join(' | ');
  const content: string[] = [user.name, contact];
  let professionalSummary = String(profile.summary || '').replace(/\s+/g, ' ').trim();
  if (preferences.summary !== false && jobDescription) {
    const evidence = [
      `Skills: ${skills.map((item: any) => item.name).filter(Boolean).join(', ')}`,
      ...experience.map((item: any) => `Experience: ${item.title || ''} | ${item.company || ''} | ${item.description || ''}`),
      ...education.map((item: any) => `Education: ${item.degree || ''} ${item.field || ''} | ${item.institution || ''} | ${item.grade || ''}`),
      ...projects.map((item: any) => `Project: ${item.title || ''} | Role: ${item.role || ''} | Technologies: ${item.technologies || ''} | ${item.description || ''} | Outcomes: ${item.outcomes || ''}`),
      ...certificates.map((item: any) => `Certification: ${item.name || ''} | ${item.issuer || ''} | Skills: ${item.skills || ''} | Credential ID: ${item.credential_id || ''}`),
      ...achievements.map((item: any) => `Achievement: ${item.name || ''}`),
      ...publications.map((item: any) => `Publication: ${item.title || ''} | ${item.type || ''} | ${item.status || ''}`),
    ].filter(Boolean).join('\n');
    try {
      professionalSummary = (await tailorProfessionalSummaryWithAI({ targetRole, jobDescription, currentSummary: professionalSummary, evidence })).summary;
    } catch (error) {
      console.error('Professional summary tailoring failed; using saved summary.', error);
    }
  }
  if (preferences.summary !== false) content.push('PROFESSIONAL SUMMARY', professionalSummary);
  const grouped = new Map<string, string[]>();
  for (const skill of skills) grouped.set(skill.category || 'Other', [...(grouped.get(skill.category || 'Other') || []), skill.name]);
  content.push('TECHNICAL SKILLS', ...[...grouped].map(([category, values]) => `${category}: ${values.join(', ')}`));
  if (experience.length) { content.push('PROFESSIONAL EXPERIENCE'); for (const item of [...experience].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))) { content.push(`${item.title}${item.company ? ` | ${item.company}` : ''}${item.location ? ` | ${item.location}` : ''}`, `${month(item.startDate)} – ${item.current ? 'Present' : month(item.endDate)}`, ...lines(item.description).map(line => `- ${line.replace(/^[-•]\s*/, '')}`)); } }
  if (projects.length) { content.push('PROJECTS'); for (const item of projects) { content.push(`${item.title}${item.role ? ` | ${item.role}` : ''}${item.technologies ? ` | ${item.technologies}` : ''}${item.project_url ? ` | ${embeddedLink('GitHub / Demo', item.project_url)}` : ''}`, [item.start_date && `${month(item.start_date)} – ${month(item.end_date) || 'Present'}`].filter(Boolean).join(''), ...lines(item.description).map(line => `- ${line.replace(/^[-•]\s*/, '')}`), ...lines(item.outcomes).map(line => `- Outcome: ${line.replace(/^[-•]\s*/, '')}`)); } }
  if (education.length) { content.push('EDUCATION'); for (const item of [...education].sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))) { content.push(`${item.degree}${item.field ? ` in ${item.field}` : ''}${item.institution ? ` | ${item.institution}` : ''}`, [item.startDate && `${month(item.startDate)} – ${month(item.endDate) || 'Present'}`, item.grade, item.location].filter(Boolean).join(' | '), ...lines(item.description).map(line => `- ${line.replace(/^[-•]\s*/, '')}`)); } }
  if (certificates.length) content.push('CERTIFICATIONS', ...certificates.map((item: any) => `${item.credential_url ? embeddedLink(item.name, item.credential_url) : item.name}${item.issuer ? ` — ${item.issuer}` : ''}${item.issued_at ? ` (${String(item.issued_at).slice(0, 10)})` : ''}${item.expires_at ? ` | Expires ${String(item.expires_at).slice(0, 10)}` : ''}${item.credential_id ? ` | Credential ID: ${item.credential_id}` : ''}${item.skills ? ` | Skills: ${item.skills}` : ''}`));
  if (achievements.length) content.push('ACHIEVEMENTS', ...achievements.map((item: any) => `- ${item.name}`));
  if (publications.length) content.push('RESEARCH & PUBLICATIONS', ...publications.map((item: any) => `- ${item.url ? embeddedLink(item.title, item.url) : item.title}${item.type ? ` | ${item.type}` : ''}${item.status ? ` | ${item.status}` : ''}${item.publisher ? ` | ${item.publisher}` : ''}${item.date ? ` | ${item.date}` : ''}`));
  if (languages.length) content.push('LANGUAGES', languages.map((item: any) => `${item.name}${item.level ? ` (${item.level})` : ''}`).join(', '));
  if (hobbies.length) content.push('INTERESTS', hobbies.map((item: any) => item.name).join(', '));
  const buffer = await createProfessionalDocx({ content: content.filter(Boolean).join('\n'), title: user.name, subtitle: targetRole || undefined, documentType: 'resume' });
  const filename = `${user.name.replace(/[^a-z0-9]+/gi, '_')}_CV.docx`;
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: Request) { return generateResume(request); }
export async function POST(request: Request) { return generateResume(request); }
