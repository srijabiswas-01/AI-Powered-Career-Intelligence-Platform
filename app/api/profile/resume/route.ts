import { getSessionUser } from '@/lib/auth';
import { analyzeResumeText } from '@/lib/ats';
import { tailorProfessionalSummaryWithAI } from '@/lib/ai';
import { buildCvDocument, cvDocumentText } from '@/lib/cv-document';
import { createCvDocx } from '@/lib/cv-docx';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

export const maxDuration = 60;

async function generateResume(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null;
  const [profile] = await database<any[]>`select * from profiles where user_id=${user.id}`;
  if (!profile) return apiError('Complete your professional profile first.', 422);
  const variantVisibility = body?.visibility && typeof body.visibility === 'object' ? body.visibility as Record<string, unknown> : undefined;
  const visible = (items: unknown, key?: string) => Array.isArray(items) ? items.filter((item, index) => item?.includeInCv !== false && (!key || !variantVisibility || !Array.isArray(variantVisibility[key]) || variantVisibility[key][index] !== false)) : [];
  const experience = visible(profile.experience_json, 'experience'), education = visible(profile.education_json, 'education');
  const skills = visible(profile.skills_json, 'skills'), languages = visible(profile.languages_json, 'languages');
  const links = visible(profile.links_json, 'links'), achievements = visible(profile.achievements_json, 'achievements'), hobbies = visible(profile.hobbies_json, 'hobbies');
  const publications = visible(profile.publications_json, 'publications');
  const params = new URL(request.url).searchParams;
  const projectIds = Array.isArray(body?.projectIds) ? body.projectIds.map(String) : (params.get('projects') || '').split(',').filter(Boolean);
  const certificateIds = Array.isArray(body?.certificateIds) ? body.certificateIds.map(String) : (params.get('certificates') || '').split(',').filter(Boolean);
  const selectedProjects = new Set(projectIds);
  const selectedCertificates = new Set(certificateIds);
  const targetRole = String(body?.targetRole || params.get('role') || profile.job_title || profile.headline || '').slice(0, 150);
  const jobDescription = String(body?.jobDescription || '').trim().slice(0, 12_000);
  const referralSource = body?.referral && typeof body.referral === 'object' ? body.referral : {};
  const referral = {
    details: String(referralSource?.details || '').trim().slice(0, 500),
    email: String(referralSource?.email || '').trim().slice(0, 180),
    phone: String(referralSource?.phone || '').trim().slice(0, 60),
    includeInCv: referralSource?.includeInCv !== false,
  };
  const allProjects = await database<any[]>`select id,title,description,technologies,project_url,role,start_date,end_date,outcomes,include_in_cv from projects where user_id=${user.id} and include_in_cv=true order by created_at desc`;
  const allCertificates = await database<any[]>`select id,name,issuer,issued_at,credential_url,credential_id,expires_at,skills,include_in_cv from certificates where user_id=${user.id} and include_in_cv=true order by issued_at desc nulls last, created_at desc`;
  const projects = Array.isArray(body?.projectIds) || params.has('projects') ? allProjects.filter(item => selectedProjects.has(String(item.id))) : allProjects;
  const certificates = Array.isArray(body?.certificateIds) || params.has('certificates') ? allCertificates.filter(item => selectedCertificates.has(String(item.id))) : allCertificates;
  if (!profile.summary || !skills.length || (!experience.length && !education.length)) return apiError('Add a summary, skills, and experience or education before generating your CV.', 422);
  const preferences = profile.cv_preferences_json || {};
  const suppliedSummary = typeof body?.professionalSummary === 'string' ? body.professionalSummary.trim().slice(0, 2500) : '';
  let professionalSummary = String((jobDescription && suppliedSummary) || profile.summary || profile.bio || '').replace(/\s+/g, ' ').trim();
  if (preferences.summary !== false && jobDescription && !suppliedSummary) {
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
  const cvDocument = buildCvDocument({
    name: user.name,
    headline: targetRole || profile.job_title || profile.headline || '',
    email: user.email,
    phone: preferences.phone === false ? '' : profile.phone,
    location: preferences.location === false ? '' : profile.location,
    summary: preferences.summary === false ? '' : professionalSummary,
    skills,
    experience,
    education,
    projects,
    certificates,
    links,
    languages,
    achievements,
    publications,
    hobbies,
    referral,
  });
  const resumeContent = cvDocumentText(cvDocument);
  const buffer = await createCvDocx(cvDocument);
  const variantFilename = String(body?.variantName || targetRole || `${user.name} CV`).trim();
  const filename = `${variantFilename.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'CareerPilot_CV'}_CV.docx`;
  const snapshot = { id: String(body?.variantId || ''), name: String(body?.variantName || targetRole || 'AI CV Builder CV').slice(0, 100), targetRole, jobDescription, projectIds, certificateIds, visibility: body?.visibility || {}, preferences, referral };
  const analysis = analyzeResumeText(resumeContent, jobDescription);
  const [existingResume] = body?.variantId ? await database<{ id: string }[]>`select id from resumes where user_id=${user.id} and source_type='ai_cv_builder' and builder_snapshot->>'id'=${String(body.variantId)}` : [];
  const [savedResume] = existingResume ? await database`
    update resumes set filename=${filename},mime_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',size_bytes=${buffer.length},content=${resumeContent},file_data=${buffer},builder_snapshot=${database.json(snapshot)},target_role=${targetRole || null},job_description=${jobDescription || null},updated_at=now()
    where id=${existingResume.id} and user_id=${user.id}
    returning id,filename,mime_type,size_bytes,created_at,source_type,builder_snapshot,target_role,job_description
  ` : await database`
    insert into resumes (user_id,filename,mime_type,size_bytes,content,file_data,source_type,builder_snapshot,target_role,job_description)
    values (${user.id},${filename},'application/vnd.openxmlformats-officedocument.wordprocessingml.document',${buffer.length},${resumeContent},${buffer},'ai_cv_builder',${database.json(snapshot)},${targetRole || null},${jobDescription || null})
    returning id,filename,mime_type,size_bytes,created_at,source_type,builder_snapshot,target_role,job_description
  `;
  await database`
    insert into resume_analyses (resume_id,score,target_role,job_description,strengths,improvements,keywords,provider)
    values (${savedResume.id},${analysis.score},${targetRole || null},${jobDescription || null},${database.json(analysis.strengths)},${database.json(analysis.improvements)},${database.json(analysis.keywords)},'builder-checklist')
  `;
  if (body?.saveOnly === true) return Response.json({ savedResume }, { status: 201 });
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) { return generateResume(request); }
export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const variantId = new URL(request.url).searchParams.get('variantId')?.trim();
  if (!variantId) return apiError('Variant ID is required.', 400);
  const deleted = await database<{ id: string }[]>`
    delete from resumes
    where user_id=${user.id} and source_type='ai_cv_builder' and builder_snapshot->>'id'=${variantId}
    returning id
  `;
  return Response.json({ ok: true, deleted: deleted.length });
}
