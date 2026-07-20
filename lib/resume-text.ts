import 'server-only';

import mammoth from 'mammoth';

async function extractPdfText(buffer: Buffer) {
  // Ensure `DOMMatrix` is available when running under Node on Vercel.
  // Newer Node versions expose many DOM globals, but older runtimes
  // or some serverless environments may not. Try to dynamically
  // import a lightweight `dommatrix` polyfill before loading pdfjs.
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    try {
      const dommatrix = await import('dommatrix');
      // dommatrix exports a `DOMMatrix` constructor
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.DOMMatrix = dommatrix.DOMMatrix || dommatrix.default?.DOMMatrix || dommatrix.default || dommatrix;
    } catch (err) {
      // If the polyfill isn't available, continue and let pdf.js throw
      // a clearer error at import time; this is a best-effort polyfill.
    }
  }

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
