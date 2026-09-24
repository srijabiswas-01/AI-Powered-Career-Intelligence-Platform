import 'server-only';
import { AlignmentType, BorderStyle, Document, LineRuleType, Packer, Paragraph, TextRun, ExternalHyperlink, Table, TableRow, TableCell, WidthType, TableLayoutType } from 'docx';
import { CV_PAGE, cvInlineParts, type CvDocument } from './cv-document';

export async function createCvDocx(document: CvDocument) {
  const twips = (mm: number) => Math.round(mm * 1440 / 25.4);
  const font = 'Arial', size = CV_PAGE.bodyPt * 2;
  const runs = (text: string, options: { bold?: boolean; italics?: boolean; size?: number } = {}) => cvInlineParts(text).map(part => {
    const run = new TextRun({ text: part.text, font, size, color: '000000', ...options });
    return part.href ? new ExternalHyperlink({ link: part.href, children: [run] }) : run;
  });
  const spacing = { before: 0, after: 0, line: Math.round(CV_PAGE.lineHeight * 240), lineRule: LineRuleType.AUTO };
  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...spacing, after: 35 }, children: runs(document.name, { bold: true, size: CV_PAGE.namePt * 2 }) }),
    ...(document.headline ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...spacing, after: 25 }, children: runs(document.headline, { bold: true, size: CV_PAGE.headlinePt * 2 }) })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...spacing, after: 55 }, children: runs(document.contact, { size: CV_PAGE.contactPt * 2 }) }),
  ];
  const width = twips(CV_PAGE.width - CV_PAGE.marginX * 2);
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  for (const [index, block] of document.blocks.entries()) {
    if (block.kind === 'section') {
      children.push(new Paragraph({ keepNext: true, spacing: { ...spacing, before: 80, after: 15 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' } }, children: runs(block.text, { bold: true, size: CV_PAGE.sectionPt * 2 }) }));
    } else if (block.kind === 'row' && block.right) {
      const leftWidth = Math.round(width * .64);
      children.push(new Table({
        width: { size: width, type: WidthType.DXA }, columnWidths: [leftWidth, width - leftWidth], layout: TableLayoutType.FIXED,
        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
        rows: [new TableRow({ cantSplit: true, children: [block.text, block.right].map((value, column) => new TableCell({
          width: { size: column === 0 ? leftWidth : width - leftWidth, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: column === 0 ? 0 : 60, right: 0 },
          children: [new Paragraph({ keepNext: block.bold || document.blocks[index + 1]?.kind === 'bullet', alignment: column === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT, spacing, children: runs(value, { bold: column === 0 && block.bold, italics: column === 1 || block.italic }) })],
        })) })],
      }));
    } else {
      const separator = block.label ? block.text.indexOf(':') : -1;
      children.push(new Paragraph({
        keepNext: block.kind === 'row' && block.bold,
        spacing,
        ...(block.kind === 'bullet' ? { indent: { left: 180, hanging: 120 } } : {}),
        children: [
          ...(block.kind === 'bullet' ? [new TextRun({ text: '- ', font, size })] : []),
          ...(separator > 0 ? [...runs(block.text.slice(0, separator + 1), { bold: true }), ...runs(block.text.slice(separator + 1))] : runs(block.text, { bold: block.bold, italics: block.italic })),
        ],
      }));
    }
  }
  return Packer.toBuffer(new Document({
    creator: 'CareerPilot AI', title: document.name,
    styles: { default: { document: { run: { font, size, color: '000000' }, paragraph: { spacing } } } },
    sections: [{ properties: { page: { size: { width: twips(CV_PAGE.width), height: twips(CV_PAGE.height) }, margin: { top: twips(CV_PAGE.marginY), bottom: twips(CV_PAGE.marginY), left: twips(CV_PAGE.marginX), right: twips(CV_PAGE.marginX) } } }, children }],
  }));
}
