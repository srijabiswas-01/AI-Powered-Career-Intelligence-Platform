import 'server-only';

import mammoth from 'mammoth';

async function extractPdfText(buffer: Buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    stopAtErrors: false,
    useWorkerFetch: false,
  });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent({ disableNormalization: false });
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) pages.push(pageText);
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  return pages.join('\n\n').trim();
}

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    const text = await extractPdfText(buffer);
    if (!text) throw new Error('No selectable text found in PDF');
    return text;
  }
  if (file.type.includes('wordprocessingml') || name.endsWith('.docx')) {
    return (await mammoth.extractRawText({ buffer })).value.trim();
  }
  if (file.type.startsWith('text/') || name.endsWith('.txt')) return buffer.toString('utf8').trim();
  return '';
}
