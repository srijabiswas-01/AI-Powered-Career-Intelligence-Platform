const stopWords = new Set('a an and are as at be been by for from has have in into is it its of on or that the their this to was were will with you your our we they them who'.split(' '));

export function extractStatisticalKeywords(value: string, limit = 10, minimumCount = 2) {
  const tokens = (value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []).filter(word => !stopWords.has(word) && !/^\d/.test(word));
  const unigramCounts = new Map<string, number>();
  const phraseCounts = new Map<string, number>();
  tokens.forEach(token => unigramCounts.set(token, (unigramCounts.get(token) || 0) + 1));
  for (let index = 0; index < tokens.length - 1; index++) {
    const phrase = `${tokens[index]} ${tokens[index + 1]}`;
    phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
  }
  const phrases = [...phraseCounts].filter(([, count]) => count >= minimumCount).map(([keyword, count]) => ({ keyword, score: count * 4 }));
  const words = [...unigramCounts].filter(([, count]) => count >= minimumCount).map(([keyword, count]) => ({ keyword, score: count * 2 }));
  return [...phrases, ...words].sort((a, b) => b.score - a.score || b.keyword.length - a.keyword.length).map(item => item.keyword).filter((keyword, index, all) => !all.slice(0, index).some(existing => existing.includes(keyword))).slice(0, limit);
}

export function analyzeResumeText(value: string, jobDescription = '') {
  const text = value.toLowerCase();
  const structuralSections = ['experience', 'education', 'skills', 'summary', 'projects'];
  const foundSections = structuralSections.filter(section => new RegExp(`(^|\\n)\\s*${section}\\s*[:\\n]`, 'i').test(value) || text.includes(`${section}:`));
  const words = text.match(/[a-z][a-z+#.]{2,}/g) ?? [];
  const jobKeywords = extractStatisticalKeywords(jobDescription, 20);
  const matchedJobKeywords = jobKeywords.filter(keyword => text.includes(keyword));
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
