import 'server-only';

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from 'docx';

type DocumentOptions = {
  content: string;
  title: string;
  subtitle?: string;
  documentType: 'resume' | 'cover-letter';
};

type InlineChild = TextRun | ExternalHyperlink;

const sectionPattern = /^(professional summary|summary|profile|core skills|skills|technical skills|professional experience|work experience|experience|selected projects|projects|education|certifications|certifications & achievements|achievements|awards|languages|interests|research & publications|publications)$/i;
const itemSections = new Set(['professional experience', 'work experience', 'experience', 'selected projects', 'projects', 'education']);
const linkPattern = /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s|]+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi;

function linkedRuns(value: string, font: string, size: number, color: string, bold = false): InlineChild[] {
  const children: InlineChild[] = [];
  let cursor = 0;

  for (const match of value.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) children.push(new TextRun({ text: value.slice(cursor, index), font, size, color, bold }));

    const raw = match[0];
    const embeddedLabel = match[1];
    const embeddedUrl = match[2];
    const detectedLink = match[3] || '';
    const target = embeddedUrl || detectedLink.replace(/[),.;]+$/, '');
    const linkText = embeddedLabel || target;
    const trailing = embeddedLabel ? '' : detectedLink.slice(target.length);
    children.push(new ExternalHyperlink({
      link: target.includes('@') && !target.startsWith('http') ? `mailto:${target}` : target,
      children: [new TextRun({ text: linkText, font, size, color, bold })],
    }));
    if (trailing) children.push(new TextRun({ text: trailing, font, size, color, bold }));
    cursor = index + raw.length;
  }

  if (cursor < value.length) children.push(new TextRun({ text: value.slice(cursor), font, size, color, bold }));
  return children.length ? children : [new TextRun({ text: value, font, size, color, bold })];
}

function labelledRuns(value: string, font: string, size: number, color: string): InlineChild[] {
  const separator = value.indexOf(':');
  if (separator < 1) return linkedRuns(value, font, size, color);
  return [
    new TextRun({ text: value.slice(0, separator + 1), font, size, color, bold: true }),
    ...linkedRuns(value.slice(separator + 1), font, size, color),
  ];
}

function itemHeadingRuns(value: string, font: string, size: number, color: string, date = ''): InlineChild[] {
  const parts = value.split(/\s+\|\s+/).filter(Boolean);
  const children: InlineChild[] = [...linkedRuns(parts[0] || value, font, size, color, true)];
  parts.slice(1).forEach((part, index) => {
    children.push(new TextRun({ text: index === 0 ? '  |  ' : ' | ', font, size, color }));
    if (/^\[[^\]]+\]\(https?:/i.test(part)) children.push(...linkedRuns(part, font, size, color));
    else children.push(new TextRun({ text: part, font, size, color, italics: true }));
  });
  if (date) {
    children.push(new TextRun({ text: '\t', font, size, color }));
    children.push(new TextRun({ text: date, font, size, color: '4B5563', italics: true }));
  }
  return children;
}

export async function createProfessionalDocx({ content, title, subtitle, documentType }: DocumentOptions) {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const ats = documentType === 'resume';
  const resumeHeader = ats && lines[0] && !sectionPattern.test(lines[0]) && lines[0].length <= 90 ? lines.shift()! : title;
  const contactLine = ats && lines[0] && /[@+]|\b(?:linkedin|github|portfolio|www\.|https?:|\d{6,})/i.test(lines[0]) ? lines.shift()! : '';
  const font = ats ? 'Arial' : 'Aptos';
  const textColor = ats ? '111827' : '253044';
  // DOCX font sizes are expressed in half-points. 22 is an easy-to-read 11pt.
  const bodySize = ats ? 22 : 20;
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [new TextRun({ text: resumeHeader, bold: true, size: ats ? 40 : 34, color: ats ? '111827' : '30257F', font })],
    }),
    ...(subtitle ? [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: subtitle, bold: true, size: ats ? 21 : 20, color: ats ? '111827' : '667085', font })],
    })] : []),
    ...(contactLine ? [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: ats ? 120 : 100, line: 240 },
      children: linkedRuns(contactLine, font, ats ? 19 : 18, ats ? '111827' : '475467'),
    })] : []),
  ];

  let currentSection = '';
  let expectItemTitle = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const bullet = /^[-*•]\s+/u.test(line);
    const heading = !bullet && line.length < 55 && (sectionPattern.test(line) || /^[A-Z][A-Z\s/&-]+$/.test(line));

    if (heading) {
      currentSection = line.toLowerCase();
      expectItemTitle = itemSections.has(currentSection);
      children.push(new Paragraph({
        keepNext: true,
        spacing: { before: ats ? 150 : 240, after: ats ? 55 : 35 },
        border: { bottom: { color: ats ? '333333' : 'D8D3F7', size: ats ? 4 : 8, style: BorderStyle.SINGLE } },
        children: [new TextRun({ text: line.toUpperCase(), bold: true, size: ats ? 21 : 22, color: ats ? '111827' : '4F3FC0', font })],
      }));
      continue;
    }

    if (bullet) {
      const value = line.replace(/^[-*•]\s+/u, '');
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: ats ? 30 : 18, line: ats ? 250 : 290 },
        indent: { left: 300, hanging: 160 },
        children: linkedRuns(value, font, bodySize, textColor),
      }));
      continue;
    }

    const looksLikeDate = /\b(?:present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|19\d{2}|20\d{2})\b/i.test(line);
    const itemTitle = itemSections.has(currentSection) && (expectItemTitle || (line.includes(' | ') && !looksLikeDate));

    if (itemTitle) {
      expectItemTitle = false;
      const nextLine = lines[lineIndex + 1] || '';
      const nextLineIsDate = /\b(?:present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|19\d{2}|20\d{2})\b/i.test(nextLine);
      children.push(new Paragraph({
        keepNext: true,
        spacing: { before: ats ? 60 : 35, after: ats ? 35 : 10, line: ats ? 250 : undefined },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: itemHeadingRuns(line, font, bodySize, textColor, nextLineIsDate ? nextLine : ''),
      }));
      if (nextLineIsDate) lineIndex += 1;
      continue;
    }

    if (looksLikeDate && itemSections.has(currentSection)) expectItemTitle = true;
    const skillLine = /skills/i.test(currentSection) && line.includes(':');
    children.push(new Paragraph({
      keepNext: looksLikeDate,
      alignment: looksLikeDate && itemSections.has(currentSection) ? AlignmentType.RIGHT : undefined,
      spacing: { after: ats ? 40 : 180, line: ats ? 250 : 290 },
      children: skillLine
        ? labelledRuns(line, font, bodySize, textColor)
        : linkedRuns(line, font, bodySize, looksLikeDate && itemSections.has(currentSection) ? '4B5563' : textColor),
    }));
  }

  const document = new Document({
    creator: 'CareerPilot AI',
    title: resumeHeader,
    description: ats ? 'ATS-friendly resume' : 'Professional cover letter',
    styles: { default: { document: { run: { font, size: bodySize, color: textColor }, paragraph: { spacing: { line: ats ? 250 : 290 } } } } },
    sections: [{
      properties: { page: { size: ats ? { width: 11906, height: 16838 } : undefined, margin: { top: ats ? 520 : 650, right: ats ? 660 : 800, bottom: ats ? 520 : 650, left: ats ? 660 : 800 } } },
      children,
      ...(ats ? {} : { footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CareerPilot AI • Page ', size: 16, color: '98A2B3' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '98A2B3' })] })] }) } }),
    }],
  });

  return Packer.toBuffer(document);
}
