import 'server-only';

import mammoth from 'mammoth';

const OCR_PAGE_LIMIT = 5;
const OCR_RENDER_SCALE = 1.5;

function pdfPageText(items: Array<Record<string, unknown>>) {
  const lines: Array<{ y: number; parts: Array<{ x: number; text: string }> }> = [];
  for (const item of items) {
    if (typeof item.str !== 'string' || !item.str.trim()) continue;
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = Number(transform[4] ?? 0);
    const y = Number(transform[5] ?? 0);
    let line = lines.find(candidate => Math.abs(candidate.y - y) < 3);
    if (!line) {
      line = { y, parts: [] };
      lines.push(line);
    }
    line.parts.push({ x, text: item.str.trim() });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map(line => line.parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' '))
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
      const pageText = pdfPageText(textContent.items as Array<Record<string, unknown>>);
      if (pageText) pages.push(pageText);
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  return pages.join('\n\n').trim();
}

async function extractPdfWithVisionOcr(buffer: Buffer) {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) throw new Error('This PDF has no selectable text and OCR is not configured.');

  const { createCanvas } = await import('@napi-rs/canvas');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    stopAtErrors: false,
    useWorkerFetch: false,
  });
  const document = await loadingTask.promise;
  try {
    if (document.numPages > OCR_PAGE_LIMIT) {
      throw new Error(`Scanned PDFs are limited to ${OCR_PAGE_LIMIT} pages. Upload a PDF with selectable text or a DOCX file.`);
    }
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        await page.render({ canvas: canvas as never, canvasContext: context as never, viewport }).promise;
        const image = canvas.toBuffer('image/png').toString('base64');
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.HUGGINGFACE_OCR_MODEL || 'Qwen/Qwen2.5-VL-3B-Instruct',
            temperature: 0,
            max_tokens: 3500,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: 'Transcribe every readable word from this resume page. Preserve headings, bullets, dates, names, skills, and contact details. Return only the transcription; do not summarize, correct, or invent text.' },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${image}` } },
              ],
            }],
          }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) throw new Error(`OCR provider returned ${response.status}.`);
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text.trim()) throw new Error('OCR provider returned no text.');
        pages.push(text.trim());
      } finally {
        page.cleanup();
      }
    }
    const text = pages.join('\n\n').trim();
    if (!text) throw new Error('OCR found no readable text in this PDF.');
    return text;
  } finally {
    await document.destroy();
  }
}

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    const text = await extractPdfText(buffer);
    return text || extractPdfWithVisionOcr(buffer);
  }
  if (file.type.includes('wordprocessingml') || name.endsWith('.docx')) {
    return (await mammoth.extractRawText({ buffer })).value.trim();
  }
  if (file.type.startsWith('text/') || name.endsWith('.txt')) return buffer.toString('utf8').trim();
  return '';
}
