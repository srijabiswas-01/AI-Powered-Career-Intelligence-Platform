"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CV_PAGE, cvInlineParts, type CvBlock, type CvDocument } from '@/lib/cv-document';

function Inline({ text, label = false }: { text: string; label?: boolean }) {
  const separator = label ? text.indexOf(':') : -1;
  if (separator > 0) return <><strong>{text.slice(0, separator + 1)}</strong><Inline text={text.slice(separator + 1)} /></>;
  return <>{cvInlineParts(text).map((part, index) => part.href ? <a key={index} href={part.href} target="_blank" rel="noreferrer">{part.text}</a> : <span key={index}>{part.text}</span>)}</>;
}

function Block({ block }: { block: CvBlock }) {
  if (block.kind === 'section') return <h3 className="cvDocSection">{block.text}</h3>;
  if (block.kind === 'row') return <div className={`cvDocRow${block.bold ? ' cvDocBold' : ''}${block.italic ? ' cvDocItalic' : ''}`}><span><Inline text={block.text} /></span>{block.right && <span className="cvDocRight"><Inline text={block.right} /></span>}</div>;
  return <p className={block.kind === 'bullet' ? 'cvDocBullet' : 'cvDocText'}><Inline text={block.text} label={block.label} /></p>;
}

function Header({ document }: { document: CvDocument }) {
  return <div className="cvDocHeader"><h1>{document.name || 'Your name'}</h1>{document.headline && <h2>{document.headline}</h2>}<p><Inline text={document.contact} /></p></div>;
}

export default function CvDocumentPreview({ document }: { document: CvDocument }) {
  const measureRef = useRef<HTMLDivElement>(null), viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1), [pages, setPages] = useState<CvBlock[][]>([document.blocks]);
  const key = JSON.stringify(document);
  const pageWidth = CV_PAGE.width * 96 / 25.4, pageHeight = CV_PAGE.height * 96 / 25.4;
  const style = {
    '--cv-width': `${pageWidth}px`, '--cv-height': `${pageHeight}px`,
    '--cv-margin-x': `${CV_PAGE.marginX}mm`, '--cv-margin-y': `${CV_PAGE.marginY}mm`,
    '--cv-body': `${CV_PAGE.bodyPt}pt`, '--cv-line': CV_PAGE.lineHeight,
    '--cv-name': `${CV_PAGE.namePt}pt`, '--cv-headline': `${CV_PAGE.headlinePt}pt`,
    '--cv-contact': `${CV_PAGE.contactPt}pt`, '--cv-section': `${CV_PAGE.sectionPt}pt`,
  } as CSSProperties;

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, node.clientWidth / pageWidth)));
    observer.observe(node);
    setScale(Math.min(1, node.clientWidth / pageWidth));
    return () => observer.disconnect();
  }, [pageWidth]);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const available = pageHeight - CV_PAGE.marginY * 2 * 96 / 25.4;
    const paginate = () => {
      const elements = Array.from(node.querySelector('.cvDocBlocks')!.children) as HTMLElement[];
      const heights = elements.map(element => element.getBoundingClientRect().height);
      const nextPages: CvBlock[][] = [[]];
      let used = node.querySelector('.cvDocHeader')!.getBoundingClientRect().height;
      document.blocks.forEach((block, index) => {
        let required = heights[index];
        // Keep headings and entry titles with the first content line.
        if (block.kind === 'section' || (block.kind === 'row' && block.bold)) {
          required += heights[index + 1] || 0;
          if (document.blocks[index + 1]?.kind === 'row') required += heights[index + 2] || 0;
        }
        if (used + required > available && nextPages[nextPages.length - 1].length) { nextPages.push([]); used = 0; }
        nextPages[nextPages.length - 1].push(block);
        used += heights[index];
      });
      setPages(nextPages);
    };
    paginate();
    const observer = new ResizeObserver(paginate);
    observer.observe(node);
    return () => observer.disconnect();
  // The serialized document avoids re-paginating on unrelated form renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pageHeight]);

  return <div className="cvDocumentViewport" ref={viewportRef} style={style}>
    <div className="cvDocumentMeasure cvDocumentPage" ref={measureRef} aria-hidden="true" inert><Header document={document} /><div className="cvDocBlocks">{document.blocks.map((block, index) => <Block block={block} key={index} />)}</div></div>
    {pages.map((blocks, page) => <div className="cvDocumentSheet" key={page} style={{ width: pageWidth * scale, height: pageHeight * scale }}><article className="cvDocumentPage" aria-label={`Resume page ${page + 1}`} style={{ transform: `scale(${scale})` }}>{page === 0 && <Header document={document} />}<div className="cvDocBlocks">{blocks.map((block, index) => <Block block={block} key={index} />)}</div></article></div>)}
  </div>;
}
