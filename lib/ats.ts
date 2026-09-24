import { extractJobKeywords, resumeContainsKeyword, sanitizeKeywordList } from './job-keywords';

export type CvBuilderAudit = {
  score: number;
  checks: Array<{ key: string; label: string; earned: number; maximum: number; detail: string }>;
  matchedKeywords: string[];
  missingKeywords: string[];
};

const stopWords = new Set('a an and are as at be been by for from has have in into is it its of on or that the their this to was were will with you your our we they them who'.split(' '));
const jobNoiseWords = new Set('about across add also before builder can candidate candidates career clear company complete contact content cv description employer essential feedback generation generated genuine hidden important information job keyword keywords length maker makers matched missing must need position profile relevant responsibilities responsible required requirements resume role section selected seeking should skills source strong summary support team teams terms text work working year years preferred including use using ability able join excellent ideal plus develop development build built create creating manage management provide knowledge'.split(' '));
const skillSignalWords = new Set('ai analytics analysis analyst intelligence learning data dashboard dashboards reporting modeling modelling model models database databases sql python power tableau excel dax query etl ssis ssrs server visualization validation cleaning kpi forecasting regression classification clustering statistical predictive trend warehousing schema star fact dimension cloud aws azure gcp docker kubernetes api apis pandas numpy pytorch tensorflow keras sklearn scikit machine nlp llm llms'.split(' '));

export function extractStatisticalKeywords(value: string, limit = 10, minimumCount = 2) {
  const known = extractJobKeywords(value, limit);
  const scrubbed = value.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' ').replace(/https?:\/\/\S+/gi, ' ');
  const tokens = (scrubbed.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []).filter(word => !stopWords.has(word) && !jobNoiseWords.has(word) && !/^\d/.test(word));
  const unigramCounts = new Map<string, number>();
  const phraseCounts = new Map<string, number>();
  tokens.forEach(token => unigramCounts.set(token, (unigramCounts.get(token) || 0) + 1));
  for (let index = 0; index < tokens.length - 1; index++) {
    const phrase = `${tokens[index]} ${tokens[index + 1]}`;
    phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
  }
  const hasSignal = (keyword: string) => keyword.split(/\s+/).some(word => skillSignalWords.has(word));
  const phrases = [...phraseCounts].filter(([keyword, count]) => count >= minimumCount && hasSignal(keyword)).map(([keyword, count]) => ({ keyword, score: count * 4 }));
  const words = [...unigramCounts].filter(([keyword, count]) => count >= minimumCount && hasSignal(keyword)).map(([keyword, count]) => ({ keyword, score: count * 2 }));
  const fallback = [...phrases, ...words].sort((a, b) => b.score - a.score || b.keyword.length - a.keyword.length).map(item => item.keyword);
  return sanitizeKeywordList([...known, ...fallback], limit);
}

export function extractAtsKeywords(value: string, limit = 60) {
  const known = extractJobKeywords(value, limit);
  const scrubbed = value.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' ').replace(/https?:\/\/\S+/gi, ' ');
  const tokens = scrubbed.toLowerCase().match(/[a-z][a-z0-9+#./-]{1,}/g) ?? [];
  const meaningful = (token: string) => !stopWords.has(token) && !jobNoiseWords.has(token) && !/^\d/.test(token) && token.length >= 2;
  const filteredTokens = tokens.filter(meaningful);
  const counts = new Map<string, number>();
  filteredTokens.forEach(token => counts.set(token, (counts.get(token) || 0) + 1));
  for (let index = 0; index < tokens.length; index += 1) {
    for (const width of [2, 3]) {
      const parts = tokens.slice(index, index + width);
      if (parts.length === width && parts.every(meaningful) && parts.some(part => skillSignalWords.has(part))) {
        const phrase = parts.join(' ');
        counts.set(phrase, (counts.get(phrase) || 0) + width + 1);
      }
    }
  }
  const generic = [...counts]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([token]) => token)
    .filter(token => token.split(/\s+/).some(part => skillSignalWords.has(part)))
    .filter(token => !known.some(keyword => keyword.toLowerCase() === token || keyword.toLowerCase().includes(` ${token}`)))
    .slice(0, Math.max(0, limit - known.length));
  return sanitizeKeywordList([...known, ...generic], limit);
}

export function analyzeResumeText(value: string, jobDescription = '') {
  const text = value.toLowerCase();
  const structuralSections = ['experience', 'education', 'skills', 'summary', 'projects'];
  const foundSections = structuralSections.filter(section => new RegExp(`(^|\\n)\\s*${section}\\s*[:\\n]`, 'i').test(value) || text.includes(`${section}:`));
  const words = text.match(/[a-z][a-z+#.]{2,}/g) ?? [];
  const jobKeywords = extractAtsKeywords(jobDescription, 60);
  const matchedJobKeywords = jobKeywords.filter(keyword => resumeContainsKeyword(value, keyword));
  const hasMetrics = /\b\d+(?:\.\d+)?%|\b\d+[kmb]?\b/.test(text);
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value);
  const hasPhone = /(?:\+?\d[\d\s()-]{7,}\d)/.test(value);
  const lengthPoints = words.length >= 250 && words.length <= 900 ? 15 : words.length >= 100 && words.length <= 1200 ? 8 : 2;
  const structurePoints = foundSections.length * 8;
  const contactPoints = (hasEmail ? 5 : 0) + (hasPhone ? 5 : 0);
  const parseabilityPoints = words.length ? 25 : 0;
  const score = Math.min(100, parseabilityPoints + structurePoints + lengthPoints + (hasMetrics ? 10 : 0) + contactPoints);
  const breakdown = [
    { key: 'parseability', label: 'ATS text parseability', earned: parseabilityPoints, maximum: 25, detail: words.length ? `${words.length} words were extracted successfully.` : 'No readable text was extracted.' },
    { key: 'sections', label: 'Resume section structure', earned: structurePoints, maximum: 40, detail: `${foundSections.length} of ${structuralSections.length} standard sections detected${foundSections.length ? `: ${foundSections.join(', ')}` : ''}.` },
    { key: 'length', label: 'Resume length', earned: lengthPoints, maximum: 15, detail: words.length >= 250 && words.length <= 900 ? 'Length is within the preferred ATS range.' : `${words.length} words detected; 250–900 is the preferred range.` },
    { key: 'metrics', label: 'Measurable achievements', earned: hasMetrics ? 10 : 0, maximum: 10, detail: hasMetrics ? 'Numbers or percentages were found.' : 'No measurable results were detected.' },
    { key: 'contact', label: 'Contact information', earned: contactPoints, maximum: 10, detail: `${hasEmail ? 'Email found' : 'Email missing'}; ${hasPhone ? 'phone found' : 'phone missing'}.` },
  ];
  const strengths = [
    ...(foundSections.length >= 3 ? ['Includes the main ATS resume sections.'] : []),
    ...(hasMetrics ? ['Uses measurable achievements.'] : []),
    ...(hasEmail && hasPhone ? ['Includes readable contact information.'] : []),
    ...(words.length >= 250 && words.length <= 900 ? ['Resume length is suitable for ATS parsing.'] : []),
  ];
  const improvements = [
    ...structuralSections.filter(section => !foundSections.includes(section)).map(section => `Add a clear ${section} section.`),
    ...(!hasMetrics ? ['Add measurable outcomes to your achievements.'] : []),
    ...(!hasEmail ? ['Add a professional email address.'] : []),
    ...(!hasPhone ? ['Add a readable phone number.'] : []),
    ...(words.length < 250 ? ['Add more role-relevant detail; the resume text is quite short.'] : []),
    ...(words.length > 900 ? ['Shorten the resume and prioritize the most relevant information.'] : []),
  ];
  return { score, strengths, improvements, keywords: jobDescription ? matchedJobKeywords : extractStatisticalKeywords(value), wordCount: words.length, breakdown };
}

export function analyzeCvBuilder(input: {
  text: string;
  jobDescription: string;
  targetRole: string;
  email: string;
  phone: string;
  skillCount: number;
  experienceCount: number;
  educationCount: number;
  projectCount: number;
  certificateCount: number;
  bulletCount: number;
}) : CvBuilderAudit {
  const { text, jobDescription, targetRole, email, phone } = input;
  const normalizedText = text.toLowerCase();
  const jobKeywords = extractAtsKeywords(jobDescription, 60);
  const matchedKeywords = jobKeywords.filter(keyword => resumeContainsKeyword(text, keyword));
  const missingKeywords = jobKeywords.filter(keyword => !resumeContainsKeyword(text, keyword));
  const words = normalizedText.match(/[a-z][a-z+#.]{2,}/g) ?? [];
  const sectionAliases: Record<string, string[]> = {
    summary: ['professional summary', 'summary', 'profile'],
    skills: ['technical skills', 'core skills', 'skills'],
    experience: ['professional experience', 'work experience', 'experience'],
    projects: ['selected projects', 'projects'],
    education: ['education'],
    certifications: ['certifications', 'certificates'],
  };
  const foundSections = Object.entries(sectionAliases).filter(([, aliases]) => aliases.some(alias => normalizedText.includes(alias))).map(([section]) => section);
  const metrics = /\b\d+(?:\.\d+)?%|\b\d+[kmb+]?\b/i.test(text);
  const contextSkills = jobKeywords.filter(keyword => resumeContainsKeyword(text, keyword)).filter(keyword => {
    const first = normalizedText.indexOf(keyword.toLowerCase());
    return first >= 0 && (normalizedText.slice(first).includes('using') || normalizedText.slice(first).includes('with') || normalizedText.slice(first).includes('developed') || normalizedText.slice(first).includes('built'));
  });
  const roleWords = targetRole.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
  const roleMatches = roleWords.filter(word => normalizedText.includes(word)).length;
  const formattingPoints = words.length && !/\t| {4,}/.test(text) ? 5 : 0;
  const checks = [
    { key: 'keywords', label: 'Job-description keywords', earned: jobKeywords.length ? Math.round(matchedKeywords.length / jobKeywords.length * 25) : 0, maximum: 25, detail: jobKeywords.length ? `${matchedKeywords.length} of ${jobKeywords.length} recognized terms matched.` : 'Paste a complete job description to measure relevance.' },
    { key: 'sections', label: 'Standard ATS sections', earned: Math.round(foundSections.length / Object.keys(sectionAliases).length * 15), maximum: 15, detail: `${foundSections.length} of ${Object.keys(sectionAliases).length} standard sections detected${foundSections.length ? `: ${foundSections.join(', ')}.` : '.'}` },
    { key: 'context', label: 'Keyword context', earned: jobKeywords.length ? Math.min(15, Math.round(contextSkills.length / jobKeywords.length * 15)) : 0, maximum: 15, detail: contextSkills.length ? `${contextSkills.length} matched terms appear near action or usage language.` : 'Show how skills were used in experience or projects.' },
    { key: 'title', label: 'Target title alignment', earned: roleWords.length ? Math.round(roleMatches / roleWords.length * 10) : 0, maximum: 10, detail: roleWords.length ? `${roleMatches} of ${roleWords.length} target-title terms found.` : 'Add a target role for title alignment.' },
    { key: 'qualifications', label: 'Education and credentials', earned: Math.min(10, (input.educationCount ? 6 : 0) + (input.certificateCount ? 4 : 0)), maximum: 10, detail: `${input.educationCount ? 'Education present' : 'Education missing'}; ${input.certificateCount ? 'certifications present' : 'certifications missing'}.` },
    { key: 'evidence', label: 'Measured achievements', earned: Math.min(10, (metrics ? 5 : 0) + (input.bulletCount >= 3 ? 5 : input.bulletCount ? 2 : 0)), maximum: 10, detail: metrics ? 'Numbers or percentages found; keep them tied to genuine outcomes.' : 'Add accurate numbers, percentages, scale, or time saved to achievement bullets.' },
    { key: 'parseability', label: 'Contact and text parseability', earned: Math.min(10, (words.length >= 100 ? 5 : words.length ? 2 : 0) + (email ? 3 : 0) + (phone ? 2 : 0)), maximum: 10, detail: `${words.length} words, ${email ? 'email' : 'no email'}, and ${phone ? 'phone' : 'no phone'} detected in the plain-text CV.` },
    { key: 'formatting', label: 'ATS-safe formatting', earned: formattingPoints, maximum: 5, detail: formattingPoints ? 'Plain text uses standard spacing without layout-breaking tabs or column gaps.' : 'Remove tabs and large spacing gaps that can disrupt ATS extraction.' },
  ];
  return { score: checks.reduce((total, check) => total + check.earned, 0), checks, matchedKeywords, missingKeywords };
}
