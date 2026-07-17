import 'server-only';

import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    try { return (await parser.getText()).text.trim(); }
    finally { await parser.destroy(); }
  }
  if (file.type.includes('wordprocessingml') || name.endsWith('.docx')) {
    return (await mammoth.extractRawText({ buffer })).value.trim();
  }
  if (file.type.startsWith('text/') || name.endsWith('.txt')) return buffer.toString('utf8').trim();
  return '';
}

