import 'server-only';

import { AlignmentType, BorderStyle, Document, Footer, Packer, PageNumber, Paragraph, TextRun } from 'docx';

type DocumentOptions = { content: string; title: string; subtitle?: string; documentType: 'resume' | 'cover-letter' };

const sectionPattern = /^(professional summary|summary|profile|core skills|skills|technical skills|professional experience|work experience|experience|projects|education|certifications|awards|languages)$/i;

export async function createProfessionalDocx({ content, title, subtitle, documentType }: DocumentOptions) {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const resumeHeader = documentType === 'resume' && lines[0] && !sectionPattern.test(lines[0]) && lines[0].length <= 90 ? lines.shift()! : title;
  const contactLine = documentType === 'resume' && lines[0] && /[@+]|\b(?:linkedin|github|portfolio|www\.|https?:|\d{6,})/i.test(lines[0]) ? lines.shift()! : '';
  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: resumeHeader, bold: true, size: documentType === 'resume' ? 38 : 32, color: '30257F', font: 'Aptos Display' })] }),
    ...(contactLine ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: contactLine, size: 19, color: '475467', font: 'Aptos' })] })] : []),
    ...(subtitle ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: subtitle, size: 19, color: '667085', italics: true, font: 'Aptos' })] })] : []),
  ];

  for (const line of lines) {
    const bullet = /^[-*•]\s+/u.test(line);
    const heading = !bullet && line.length < 55 && (sectionPattern.test(line) || /^[A-Z][A-Z\s/&-]+$/.test(line));
    if (heading) {
      children.push(new Paragraph({ spacing: { before: 240, after: 90 }, border: { bottom: { color: 'D8D3F7', size: 8, style: BorderStyle.SINGLE } }, children: [new TextRun({ text: line.toUpperCase(), bold: true, size: 22, color: '4F3FC0', font: 'Aptos' })] }));
    } else if (bullet) {
      children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 65, line: 280 }, children: [new TextRun({ text: line.replace(/^[-*•]\s+/u, ''), size: 20, color: '253044', font: 'Aptos' })] }));
    } else {
      children.push(new Paragraph({ keepNext: documentType === 'resume' && line.length < 90, spacing: { after: documentType === 'cover-letter' ? 180 : 85, line: 290 }, children: [new TextRun({ text: line, bold: documentType === 'resume' && line.length < 90, size: 20, color: '253044', font: 'Aptos' })] }));
    }
  }

  const document = new Document({
    creator: 'Clymbra AI',
    title: resumeHeader,
    description: documentType === 'resume' ? 'Professionally tailored ATS-friendly resume' : 'Professional cover letter',
    styles: { default: { document: { run: { font: 'Aptos', size: 20, color: '253044' }, paragraph: { spacing: { line: 290 } } } } },
    sections: [{
      properties: { page: { margin: { top: 650, right: 800, bottom: 650, left: 800 } } },
      children,
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Clymbra AI  •  Page ', size: 16, color: '98A2B3' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '98A2B3' })] })] }) },
    }],
  });
  return Packer.toBuffer(document);
}
