import { getSessionUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { apiError } from '@/lib/http';

const text = (value: unknown, maximum = 500) => String(value ?? '').trim().slice(0, maximum);
const list = (value: unknown, maximum: number) => Array.isArray(value) ? value.slice(0, maximum) : [];
const visibility = (item: any) => item?.includeInCv !== false;

const cleanSkills = (value: unknown) => list(value, 80).map((item: any) => ({ name: text(item?.name, 80), category: text(item?.category, 50) || 'Other', includeInCv: visibility(item) })).filter(item => item.name);
const cleanExperience = (value: unknown) => list(value, 20).map((item: any) => ({
  title: text(item?.title, 120), company: text(item?.company, 120), location: text(item?.location, 120), startDate: text(item?.startDate, 20),
  endDate: text(item?.endDate, 20), current: Boolean(item?.current), description: text(item?.description, 2500), includeInCv: visibility(item),
})).filter(item => item.title || item.company);
const cleanEducation = (value: unknown) => list(value, 20).map((item: any) => ({
  degree: text(item?.degree, 150), field: text(item?.field, 150), institution: text(item?.institution, 180), location: text(item?.location, 120),
  startDate: text(item?.startDate, 20), endDate: text(item?.endDate, 20), grade: text(item?.grade, 60), description: text(item?.description, 1000), includeInCv: visibility(item),
})).filter(item => item.degree || item.institution);
const cleanNamedList = (value: unknown, maximum: number, withLevel = false) => list(value, maximum).map((item: any) => ({
  name: text(item?.name, 100), ...(withLevel ? { level: text(item?.level, 50) } : {}), includeInCv: visibility(item),
})).filter(item => item.name);
const cleanLinks = (value: unknown) => list(value, 20).map((item: any) => ({ platform: text(item?.platform, 50), label: text(item?.label, 80), url: text(item?.url, 500), includeInCv: visibility(item) }))
  .filter(item => item.platform && /^https?:\/\//i.test(item.url));
const cleanPublications = (value: unknown) => list(value, 30).map((item: any) => ({ title: text(item?.title, 250), type: text(item?.type, 50), status: text(item?.status, 50), publisher: text(item?.publisher, 180), date: text(item?.date, 20), url: text(item?.url, 500), includeInCv: visibility(item) })).filter(item => item.title);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const [profile] = await database`
    select headline, location, phone, bio, skills, avatar_data_url, job_title, summary, skills_json,
      experience_json, education_json, languages_json, links_json, hobbies_json, achievements_json, publications_json, cv_variants_json, cv_preferences_json, skill_categories_json
    from profiles where user_id = ${user.id}
  `;
  return Response.json({ user, profile: profile || {} });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError('Authentication required.', 401);
  const body = await request.json().catch(() => null);
  const fullName = text(body?.fullName, 120);
  if (fullName.length < 2) return apiError('Full name must contain at least 2 characters.');
  const avatar = text(body?.avatarDataUrl, 1_500_000);
  if (avatar && !/^data:image\/(?:png|jpeg|webp);base64,/i.test(avatar)) return apiError('Profile picture must be a PNG, JPEG, or WebP image.');
  const phone = text(body?.phone);
  if (phone && !/^\+?[0-9][0-9\s().-]{7,20}$/.test(phone)) return apiError('Enter a valid phone number.');
  const invalidLink = list(body?.links, 20).find((item: any) => text(item?.url) && !/^https?:\/\//i.test(text(item?.url)));
  if (invalidLink) return apiError(`${text((invalidLink as any)?.platform) || 'Professional'} link must start with http:// or https://.`);
  if (list(body?.experience, 20).some((item: any) => item?.startDate && item?.endDate && !item?.current && String(item.endDate) < String(item.startDate))) return apiError('An experience end date cannot be before its start date.');
  if (list(body?.education, 20).some((item: any) => item?.startDate && item?.endDate && String(item.endDate) < String(item.startDate))) return apiError('An education end date cannot be before its start date.');
  const skills = cleanSkills(body?.skills), experience = cleanExperience(body?.experience), education = cleanEducation(body?.education);
  const skillCategories = [...new Set(list(body?.skillCategories, 40).map(item => text(item, 50)).filter(Boolean))];
  const languages = cleanNamedList(body?.languages, 20, true), hobbies = cleanNamedList(body?.hobbies, 30), achievements = cleanNamedList(body?.achievements, 30);
  const links = cleanLinks(body?.links), summary = text(body?.summary, 2500);
  const publications = cleanPublications(body?.publications);
  const preferences = { location: body?.cvPreferences?.location !== false, phone: body?.cvPreferences?.phone !== false, summary: body?.cvPreferences?.summary !== false };
  const variants = list(body?.cvVariants, 12).map((item: any) => ({ id: text(item?.id, 80), name: text(item?.name, 100), targetRole: text(item?.targetRole, 150), jobDescription: text(item?.jobDescription, 12000), projectIds: list(item?.projectIds, 30).map(String), certificateIds: list(item?.certificateIds, 30).map(String), visibility: Object.fromEntries(Object.entries(item?.visibility || {}).slice(0, 10).map(([key, values]) => [text(key, 40), list(values, 100).map(Boolean)])), preferences: { location: item?.preferences?.location !== false, phone: item?.preferences?.phone !== false, summary: item?.preferences?.summary !== false }, referral: { details: text(item?.referral?.details, 500), email: text(item?.referral?.email, 180), phone: text(item?.referral?.phone, 60), includeInCv: item?.referral?.includeInCv !== false } })).filter(item => item.id && item.name);
  await database`update users set name = ${fullName} where id = ${user.id}`;
  const [profile] = await database`
    insert into profiles (user_id, headline, location, phone, bio, skills, avatar_data_url, job_title, summary, skills_json,
      experience_json, education_json, languages_json, links_json, hobbies_json, achievements_json, publications_json, cv_variants_json, cv_preferences_json, skill_categories_json)
    values (${user.id}, ${text(body?.headline) || null}, ${text(body?.location) || null}, ${phone || null}, ${summary || null},
      ${skills.map(item => item.name).join(', ') || null}, ${avatar || null}, ${text(body?.jobTitle) || null}, ${summary || null}, ${database.json(skills)},
      ${database.json(experience)}, ${database.json(education)}, ${database.json(languages)}, ${database.json(links)}, ${database.json(hobbies)}, ${database.json(achievements)}, ${database.json(publications)}, ${database.json(variants)}, ${database.json(preferences)}, ${database.json(skillCategories)})
    on conflict(user_id) do update set headline=excluded.headline, location=excluded.location, phone=excluded.phone, bio=excluded.bio,
      skills=excluded.skills, avatar_data_url=excluded.avatar_data_url, job_title=excluded.job_title, summary=excluded.summary,
      skills_json=excluded.skills_json, experience_json=excluded.experience_json, education_json=excluded.education_json,
      languages_json=excluded.languages_json, links_json=excluded.links_json, hobbies_json=excluded.hobbies_json,
      achievements_json=excluded.achievements_json, publications_json=excluded.publications_json, cv_variants_json=excluded.cv_variants_json,
      cv_preferences_json=excluded.cv_preferences_json, skill_categories_json=excluded.skill_categories_json, updated_at=now()
    returning *
  `;
  return Response.json({ user: { id: user.id, name: fullName, email: user.email }, profile });
}
