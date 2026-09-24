/** One content model and page specification for the builder, print and DOCX. */
export const CV_PAGE = { width: 210, height: 297, marginX: 10, marginY: 10, bodyPt: 10, lineHeight: 1.12, namePt: 16, headlinePt: 9.5, contactPt: 8.5, sectionPt: 9.5 } as const;
export type CvBlock = { kind: 'section' | 'text' | 'bullet' | 'row'; text: string; right?: string; bold?: boolean; italic?: boolean; label?: boolean };
export type CvDocument = { name: string; headline: string; contact: string; blocks: CvBlock[] };
type Entry = {
  name?: string; title?: string; company?: string; location?: string; description?: string;
  startDate?: string; endDate?: string; current?: boolean; degree?: string; field?: string;
  institution?: string; grade?: string; category?: string; level?: string; platform?: string;
  label?: string; url?: string; technologies?: string; project_url?: string; role?: string;
  start_date?: string; end_date?: string; outcomes?: string; issuer?: string; issued_at?: string;
  expires_at?: string; credential_id?: string; credential_url?: string; skills?: string;
  type?: string; status?: string; publisher?: string; date?: string; includeInCv?: boolean;
};
type Referral = { details?: unknown; email?: unknown; phone?: unknown; includeInCv?: boolean };
export type CvDocumentInput = {
  name: string; headline: string; email: string; phone?: string; location?: string; summary?: string;
  skills: Entry[]; experience: Entry[]; education: Entry[]; projects: Entry[]; certificates: Entry[];
  links: Entry[]; languages: Entry[]; achievements: Entry[]; publications: Entry[]; hobbies: Entry[];
  referral?: Referral;
};
const textValue = (value: unknown) => String(value ?? '');
const join = (values: unknown[], separator = ' | ') => values.map(textValue).filter(Boolean).join(separator);
const month = (value: unknown = '') => {
  const match = /^(\d{4})-(\d{2})/.exec(textValue(value));
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
};
const dates = (start?: string, end?: string, current = false) => join([month(start), current ? 'Present' : month(end)], ' - ');
export const cvLink = (label: unknown = '', url: unknown = '') => {
  const cleanLabel = String(label ?? '').replace(/[\[\]]/g, '');
  const target = String(url ?? '').trim();
  if (!target) return cleanLabel;
  // Only web and email links are rendered as active links.
  if (/^(https?:\/\/|mailto:)/i.test(target)) return `[${cleanLabel}](${target.replace(/[\s()]/g, encodeURIComponent)})`;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(target)) return `[${cleanLabel}](https://${target.replace(/[\s()]/g, encodeURIComponent)})`;
  return cleanLabel;
};

export function buildCvDocument(input: CvDocumentInput): CvDocument {
  const blocks: CvBlock[] = [];
  const section = (text: string) => blocks.push({ kind: 'section', text });
  const text = (value: unknown, label = false) => { const content = textValue(value); if (content) blocks.push({ kind: 'text', text: content, label }); };
  const row = (left: unknown, right: unknown = '', bold = false, italic = false) => { const leftText = textValue(left), rightText = textValue(right); if (leftText || rightText) blocks.push({ kind: 'row', text: leftText, right: rightText, bold, italic }); };
  const bullets = (value: unknown = '') => textValue(value).split(/\r?\n/).map(line => line.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean).forEach(line => blocks.push({ kind: 'bullet', text: line }));
  const visible = (items: Entry[] = []) => items.filter(item => item.includeInCv !== false);
  const referral = input.referral;
  const referralDetails = textValue(referral?.details).trim();
  const referralEmail = textValue(referral?.email).trim();
  const referralPhone = textValue(referral?.phone).trim();
  if (referral?.includeInCv !== false && (referralDetails || referralEmail || referralPhone)) {
    section('REFERRAL / REFERENCE');
    text(join([referralDetails, referralEmail && `Email: ${referralEmail}`, referralPhone && `Phone: ${referralPhone}`]));
  }
  const summary = textValue(input.summary).trim();
  if (summary) { section('PROFESSIONAL SUMMARY'); text(summary); }
  const skills = visible(input.skills || []);
  if (skills.length) {
    section('TECHNICAL SKILLS');
    const groups = new Map<string, string[]>();
    for (const skill of skills) {
      const name = textValue(skill.name).trim(), category = textValue(skill.category).trim() || 'Other';
      if (name) groups.set(category, [...(groups.get(category) || []), name]);
    }
    Array.from(groups).forEach(([category, names]) => text(`${category}: ${names.join(', ')}`, true));
  }
  const experience = visible(input.experience || []).sort((a, b) => textValue(b.startDate).localeCompare(textValue(a.startDate)));
  if (experience.length) {
    section('PROFESSIONAL EXPERIENCE');
    for (const item of experience) {
      row(item.company || item.title || '', dates(item.startDate, item.endDate, item.current), true);
      row(item.company ? item.title || '' : '', item.location);
      bullets(item.description);
    }
  }
  const projects = visible(input.projects || []);
  if (projects.length) {
    section('SELECTED PROJECTS');
    for (const item of projects) {
      row(cvLink(item.title, item.project_url), item.technologies, true);
      row(item.role || '', dates(item.start_date, item.end_date));
      bullets(item.description); bullets(item.outcomes);
    }
  }
  const education = visible(input.education || []).sort((a, b) => textValue(b.endDate).localeCompare(textValue(a.endDate)));
  if (education.length) {
    section('EDUCATION');
    for (const item of education) {
      row(item.institution || '', dates(item.startDate, item.endDate), true);
      row(join([join([item.degree, item.field], ' in '), item.grade]), item.location, false, true);
      bullets(item.description);
    }
  }
  const certificates = visible(input.certificates || []);
  if (certificates.length) {
    section('CERTIFICATIONS');
    for (const item of certificates) {
      row(join([cvLink(item.name, item.credential_url), item.issuer]), month(item.issued_at), true);
      text(join([item.credential_id && `Credential ID: ${item.credential_id}`, item.expires_at && `Expires: ${month(item.expires_at)}`, item.skills && `Skills: ${item.skills}`]));
    }
  }
  const achievements = visible(input.achievements || []);
  if (achievements.length) { section('ACHIEVEMENTS'); achievements.forEach(item => text(item.name || '')); }
  const publications = visible(input.publications || []);
  if (publications.length) {
    section('RESEARCH & PUBLICATIONS');
    publications.forEach(item => text(join([cvLink(item.title, item.url), item.type, item.status, item.publisher, item.date])));
  }
  const languages = visible(input.languages || []), hobbies = visible(input.hobbies || []);
  if (languages.length || hobbies.length) {
    section('ADDITIONAL INFORMATION');
    if (languages.length) text(`Languages: ${languages.map(item => `${item.name}${item.level ? ` (${item.level})` : ''}`).join(' | ')}`, true);
    if (hobbies.length) text(`Interests: ${hobbies.map(item => item.name).filter(Boolean).join(', ')}`, true);
  }
  return {
    name: input.name, headline: input.headline,
    contact: join([input.location, input.phone, cvLink(input.email, `mailto:${input.email}`), ...visible(input.links).map(item => cvLink(item.platform === 'Other' ? item.label || 'Professional link' : item.platform || item.label, item.url))]),
    blocks,
  };
}

export const cvDocumentText = (document: CvDocument) => [document.name, document.headline, document.contact, ...document.blocks.map(block => `${block.kind === 'bullet' ? '- ' : ''}${block.text}${block.right ? ` | ${block.right}` : ''}`)].filter(Boolean).join('\n');

export function cvInlineParts(value: string) {
  return value.split(/(\[[^\]]+\]\((?:https?:\/\/|mailto:)[^\s)]+\))/gi).filter(Boolean).map(text => {
    const match = /^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)$/i.exec(text);
    return match ? { text: match[1], href: match[2] } : { text };
  });
}
