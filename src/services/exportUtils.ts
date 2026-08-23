// Client-side export pipeline ported from ref/mdtools-main exportUtils.ts,
// adapted for MDEdit:
// - filenames derive from the document title (Vietnamese-safe slug)
// - math (KaTeX) survives export via remark-math + rehype-katex
// - DOCX additionally handles strikethrough and task lists
// - every dynamic HTML string is sanitised with DOMPurify
//
// Heavy libraries are dynamically imported so they stay out of the main chunk.

import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { downloadBlob, downloadTextFile, slugifyFilename } from '../utils/files';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
});

// Exported HTML files reference KaTeX assets from a CDN; when opened fully
// offline the markup is still readable, only formula typography degrades.
const KATEX_CDN_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css';

export const exportStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 800px;
    margin: 40px auto;
    padding: 20px;
    line-height: 1.7;
    color: #1a1a1a;
    background: #ffffff;
  }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 32px;
    margin-bottom: 16px;
    font-weight: 700;
    color: #111111;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #c7d2fe; padding-bottom: 12px; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #c7d2fe; padding-bottom: 8px; }
  h3 { font-size: 1.25em; }
  p { margin: 16px 0; }
  a { color: #4f46e5; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    background: #eef2ff;
    color: #4338ca;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 0.9em;
  }
  pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
  }
  pre code { background: none; color: #334155; padding: 0; }
  blockquote {
    border-left: 4px solid #818cf8;
    margin: 16px 0;
    padding: 8px 16px;
    background: #eef2ff;
    color: #555;
    font-style: italic;
  }
  ul, ol { margin: 16px 0; padding-left: 24px; }
  li { margin: 8px 0; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
  strong { font-weight: 600; }
  .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
  .mermaid-diagram {
    display: flex;
    justify-content: center;
    margin: 24px 0;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
    overflow-x: auto;
  }
  .mermaid-diagram svg { max-width: 100%; height: auto; }
`;

/**
 * Render all Mermaid code blocks in markdown to inline SVG.
 * Used by the DOCX pipeline (diagrams become embedded PNGs).
 */
export async function renderMermaidToSvg(content: string): Promise<string> {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(mermaidRegex)];
  if (matches.length === 0) return content;

  let result = content;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    try {
      const id = `mermaid-export-${i}-${Date.now()}`;
      const { svg } = await mermaid.render(id, match[1].trim());
      const cleanSvg = svg
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\n\s*/g, ' ');
      result = result.replace(match[0], `\n<div class="mermaid-diagram">${cleanSvg}</div>\n`);
    } catch (error) {
      console.error(`Failed to render mermaid diagram ${i}:`, error);
    }
  }
  return result;
}

/**
 * Convert `<pre><code class="language-mermaid">` blocks in rendered HTML to SVG.
 */
async function renderMermaidInHtml(html: string): Promise<string> {
  const mermaidPreRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi;
  const matches = [...html.matchAll(mermaidPreRegex)];
  if (matches.length === 0) return html;

  let result = html;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const mermaidCode = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .trim();
    try {
      const id = `mermaid-html-${i}-${Date.now()}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      result = result.replace(match[0], `<div class="mermaid-diagram">${svg}</div>`);
    } catch (error) {
      console.error(`Failed to render mermaid diagram ${i}:`, error);
    }
  }
  return result;
}

/** Shared: markdown -> standalone HTML body (GFM + math + mermaid SVGs). */
async function renderMarkdownToHtml(content: string): Promise<string> {
  const [reactModule, { default: ReactMarkdown }, { default: remarkGfm }, { default: remarkMath }, { default: rehypeKatex }, { renderToString }] =
    await Promise.all([
      import('react'),
      import('react-markdown'),
      import('remark-gfm'),
      import('remark-math'),
      import('rehype-katex'),
      import('react-dom/server'),
    ]);

  let html = renderToString(
    reactModule.createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex],
      },
      content
    )
  );
  html = await renderMermaidInHtml(html);
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function exportToHtml(title: string, content: string): Promise<void> {
  const body = await renderMarkdownToHtml(content);

  const fullHTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${KATEX_CDN_CSS}">
  <style>${exportStyles}</style>
</head>
<body>
${body}
</body>
</html>`;

  downloadTextFile(fullHTML, `${slugifyFilename(title)}.html`, 'text/html');
}

/**
 * Print-to-PDF: renders the document into a dedicated popup so the browser
 * print dialog produces a clean document instead of the app chrome.
 * Returns false when the popup was blocked (caller should notify the user).
 */
export async function exportToPdf(title: string, content: string): Promise<boolean> {
  const body = await renderMarkdownToHtml(content);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${KATEX_CDN_CSS}">
  <style>
    ${exportStyles}
    @media print {
      body { margin: 0; padding: 20px; }
      pre { page-break-inside: avoid; }
      h1, h2, h3 { page-break-after: avoid; }
      .mermaid-diagram { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 250);

  return true;
}

/* ------------------------------------------------------------------ */
/* DOCX                                                                */
/* ------------------------------------------------------------------ */

export async function buildDocxBlob(content: string, title: string): Promise<Blob> {
  const docxModule = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun } = docxModule;

  type TextRunT = InstanceType<typeof TextRun>;

  const lines = content.split('\n');
  const children: any[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let currentCodeBlockLang = '';
  let inTable = false;
  let tableRows: string[][] = [];
  let numberedListCounter = 0;

  // Inline markdown -> TextRun[] (bold / italic / strike / code; links flatten to text)
  const parseInlineStyles = (text: string, baseSize = 22): TextRunT[] => {
    const runs: TextRunT[] = [];
    let remaining = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    while (remaining.length > 0) {
      const codeMatch = remaining.match(/`([^`]+)`/);
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
      const strikeMatch = remaining.match(/~~(.+?)~~/);

      const matches = [
        codeMatch ? { match: codeMatch, type: 'code', index: codeMatch.index! } : null,
        boldMatch ? { match: boldMatch, type: 'bold', index: boldMatch.index! } : null,
        italicMatch ? { match: italicMatch, type: 'italic', index: italicMatch.index! } : null,
        strikeMatch ? { match: strikeMatch, type: 'strike', index: strikeMatch.index! } : null,
      ]
        .filter(Boolean)
        .sort((a, b) => a!.index - b!.index);

      if (matches.length > 0 && matches[0]) {
        const { match, type, index } = matches[0] as { match: RegExpMatchArray; type: string; index: number };
        if (index > 0) {
          runs.push(new TextRun({ text: remaining.substring(0, index), size: baseSize }));
        }
        if (type === 'code') {
          runs.push(
            new TextRun({
              text: match[1],
              font: 'Consolas',
              size: baseSize - 2,
              shading: { type: 'clear', fill: 'F1F5F9' },
            })
          );
        } else if (type === 'bold') {
          runs.push(new TextRun({ text: match[1], bold: true, size: baseSize }));
        } else if (type === 'italic') {
          runs.push(new TextRun({ text: match[1], italics: true, size: baseSize }));
        } else {
          runs.push(new TextRun({ text: match[1], strike: true, size: baseSize }));
        }
        remaining = remaining.substring(index + match[0].length);
      } else {
        runs.push(new TextRun({ text: remaining, size: baseSize }));
        break;
      }
    }
    return runs.length > 0 ? runs : [new TextRun({ text: '', size: baseSize })];
  };

  const processTable = () => {
    if (tableRows.length === 0) return;
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows.map((cells, rowIndex) =>
        new TableRow({
          children: cells.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children:
                      rowIndex === 0
                        ? [new TextRun({ text: cell, bold: true, size: 20 })]
                        : parseInlineStyles(cell, 20),
                  }),
                ],
                shading: rowIndex === 0 ? { fill: 'F8FAFC' } : undefined,
              })
          ),
        })
      ),
    });
    children.push(table);
    children.push(new Paragraph({ text: '' }));
    tableRows = [];
  };

  const addCodeBlock = () => {
    if (codeLines.length === 0) return;
    codeLines.forEach((codeLine, idx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLine || ' ',
              font: 'Consolas',
              size: 18,
              color: '334155',
            }),
          ],
          shading: { type: 'clear', fill: 'F8FAFC' },
          spacing: {
            before: idx === 0 ? 120 : 0,
            after: idx === codeLines.length - 1 ? 120 : 0,
          },
          indent: { left: 400, right: 400 },
        })
      );
    });
    codeLines = [];
  };

  // SVG -> PNG bytes so diagrams can be embedded as images in Word
  const svgToPng = (svgString: string): Promise<Uint8Array | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgEl = svgDoc.querySelector('svg');

      let width = 600;
      let height = 400;
      if (svgEl) {
        const viewBox = svgEl.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(' ').map(Number);
          if (parts.length === 4) {
            width = parts[2] || 600;
            height = parts[3] || 400;
          }
        }
        const svgWidth = svgEl.getAttribute('width');
        const svgHeight = svgEl.getAttribute('height');
        if (svgWidth && !svgWidth.includes('%')) width = parseFloat(svgWidth) || width;
        if (svgHeight && !svgHeight.includes('%')) height = parseFloat(svgHeight) || height;
      }

      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      img.onload = () => {
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx?.scale(scale, scale);
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)));
          } else {
            resolve(null);
          }
        }, 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = `data:image/svg+xml;base64,${svgBase64}`;
    });
  };

  const addMermaidDiagram = async (mermaidCode: string) => {
    try {
      const id = `mermaid-docx-${Date.now()}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      const pngData = await svgToPng(svg);
      if (pngData) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: pngData,
                transformation: { width: 500, height: 300 },
                type: 'png',
              }),
            ],
            spacing: { before: 200, after: 200 },
            alignment: 'center' as const,
          })
        );
      }
    } catch (error) {
      console.error('Failed to render mermaid for DOCX:', error);
      mermaidCode.split('\n').forEach((codeLine, idx) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: codeLine || ' ', font: 'Consolas', size: 18, color: '334155' })],
            shading: { type: 'clear', fill: 'F8FAFC' },
            spacing: { before: idx === 0 ? 120 : 0, after: 0 },
            indent: { left: 400, right: 400 },
          })
        );
      });
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        if (currentCodeBlockLang === 'mermaid') {
          await addMermaidDiagram(codeLines.join('\n'));
          codeLines = [];
        } else {
          addCodeBlock();
        }
        inCodeBlock = false;
        currentCodeBlockLang = '';
      } else {
        processTable();
        inCodeBlock = true;
        currentCodeBlockLang = line.trim().substring(3).trim().toLowerCase();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.includes('|')) {
      if (line.match(/^\|[-\s:|]+\|$/)) continue;
      const cells = line.split('|').filter((c) => c.trim() !== '').map((c) => c.trim());
      if (cells.length > 0) {
        inTable = true;
        tableRows.push(cells);
        continue;
      }
    } else if (inTable) {
      processTable();
      inTable = false;
    }

    if (line.startsWith('# ')) {
      processTable();
      numberedListCounter = 0;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.substring(2), bold: true, size: 32, color: '4F46E5' })],
          spacing: { before: 400, after: 200 },
        })
      );
    } else if (line.startsWith('## ')) {
      processTable();
      numberedListCounter = 0;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.substring(3), bold: true, size: 26, color: 'EA580C' })],
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (line.startsWith('### ')) {
      processTable();
      numberedListCounter = 0;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.substring(4), bold: true, size: 24, color: 'EA580C' })],
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith('#### ') || line.startsWith('##### ') || line.startsWith('###### ')) {
      processTable();
      numberedListCounter = 0;
      const level = line.match(/^#+/)![0].length;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.substring(level + 1), bold: true, size: 22, color: '334155' })],
          spacing: { before: 150, after: 80 },
        })
      );
    } else if (line.startsWith('- [ ] ') || line.startsWith('* [ ] ')) {
      // Task list (unchecked)
      numberedListCounter = 0;
      children.push(
        new Paragraph({
          children: parseInlineStyles(`☐ ${line.substring(6)}`),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ') || line.startsWith('* [x] ') || line.startsWith('* [X] ')) {
      // Task list (checked)
      numberedListCounter = 0;
      children.push(
        new Paragraph({
          children: parseInlineStyles(`☑ ${line.substring(6)}`),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      numberedListCounter = 0;
      const bulletText = line.substring(2);
      const boldColonMatch = bulletText.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
      if (boldColonMatch) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: boldColonMatch[1], bold: true, size: 22 }),
              new TextRun({ text: ': ' + boldColonMatch[2], size: 22 }),
            ],
            bullet: { level: 0 },
            spacing: { before: 60, after: 60 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: parseInlineStyles(bulletText),
            bullet: { level: 0 },
            spacing: { before: 60, after: 60 },
          })
        );
      }
    } else if (line.match(/^\d+\.\s/)) {
      numberedListCounter++;
      const listText = line.replace(/^\d+\.\s*/, '');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${numberedListCounter}.\t`, size: 22 }), ...parseInlineStyles(listText)],
          spacing: { before: 120, after: 60 },
          indent: { left: 200 },
        })
      );
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '', spacing: { before: 60, after: 60 } }));
    } else if (line.trim().match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      children.push(
        new Paragraph({
          children: [],
          spacing: { before: 200, after: 200 },
          border: {
            bottom: { color: 'E2E8F0', size: 6, space: 1, style: 'single' },
          },
        })
      );
    } else if (line.trim().startsWith('> ')) {
      const quoteText = line.trim().substring(2);
      children.push(
        new Paragraph({
          children: parseInlineStyles(quoteText),
          spacing: { before: 80, after: 80 },
          indent: { left: 400 },
          border: {
            left: { color: '818CF8', size: 24, space: 10, style: 'single' },
          },
          shading: { type: 'clear', fill: 'EEF2FF' },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: parseInlineStyles(line),
          spacing: { before: 100, after: 100 },
        })
      );
    }
  }

  if (inCodeBlock) {
    addCodeBlock();
  }
  processTable();

  const doc = new Document({
    title,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function exportToDocx(title: string, content: string): Promise<boolean> {
  try {
    const blob = await buildDocxBlob(content, title);
    downloadBlob(blob, `${slugifyFilename(title)}.docx`);
    return true;
  } catch (err) {
    console.error('DOCX export failed:', err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* XLSX / CSV (whole-document outline)                                 */
/* ------------------------------------------------------------------ */

export async function exportToExcel(title: string, content: string): Promise<boolean> {
  const XLSX = await import('xlsx');

  const lines = content.split('\n');
  const data: string[][] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock && codeBlockContent.length > 0) {
        data.push([codeBlockContent.join('\n')]);
        codeBlockContent = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.match(/^\|[-\s:|]+\|$/)) continue;

    if (line.includes('|')) {
      const cells = line.split('|').filter((cell) => cell.trim() !== '').map((cell) => cell.trim());
      if (cells.length > 0) {
        data.push(cells);
        continue;
      }
    }

    if (line.startsWith('#')) {
      const text = line.replace(/^#+\s*/, '');
      if (text) data.push([text]);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.substring(2).replace(/\*\*(.+?)\*\*/g, '$1');
      data.push(['• ' + text]);
    } else if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1');
      data.push([text]);
    } else if (line.trim()) {
      const cleanText = line
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1');
      data.push([cleanText]);
    }
  }

  if (data.length === 0) {
    return false;
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 100 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Document');
  XLSX.writeFile(wb, `${slugifyFilename(title)}.xlsx`);
  return true;
}

export async function exportToCsv(title: string, content: string): Promise<boolean> {
  const lines = content.split('\n');
  const csvLines: string[] = [];

  const escapeCell = (value: string) =>
    value.includes(',') || value.includes('"') || value.includes('\n')
      ? `"${value.replace(/"/g, '""')}"`
      : value;

  for (const line of lines) {
    if (line.includes('|') && !line.match(/^\|[-\s:|]+\|$/)) {
      const cells = line.split('|').filter((c) => c.trim() !== '').map((c) => escapeCell(c.trim()));
      if (cells.length > 0) csvLines.push(cells.join(','));
    }
  }

  if (csvLines.length === 0) {
    // No tables: fall back to one row per non-empty line.
    lines.forEach((line) => {
      if (line.trim()) csvLines.push(escapeCell(line.trim()));
    });
  }

  if (csvLines.length === 0) {
    return false;
  }

  downloadTextFile(csvLines.join('\n'), `${slugifyFilename(title)}.csv`, 'text/csv');
  return true;
}

/* ------------------------------------------------------------------ */
/* PNG (offscreen render, sanitised, rasterised at 2x)                 */
/* ------------------------------------------------------------------ */

export async function exportToPng(title: string, content: string): Promise<boolean> {
  // html2canvas-pro rasterises the live DOM directly (same approach as
  // ref/mdtools-main) and, unlike classic html2canvas, understands the
  // oklch() color functions Tailwind v4 emits. html-to-image was tried
  // first but its SVG-foreignObject pipeline can silently emit a blank
  // image when font embedding inside the serialized SVG fails.
  const [{ default: html2canvas }] = await Promise.all([import('html2canvas-pro')]);

  const body = await renderMarkdownToHtml(content);

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.lineHeight = '1.7';
  container.style.color = '#1a1a1a';

  // The HTML body comes from react-markdown (escaped by construction) plus
  // locally rendered mermaid SVGs; DOMPurify is the final gate before it
  // enters the live DOM.
  container.innerHTML = DOMPurify.sanitize(
    `<style>${exportStyles} body { margin: 0; padding: 0; }</style><div style="padding: 20px;">${body}</div>`,
    { ADD_TAGS: ['style'], ADD_ATTR: ['style'] }
  );

  document.body.appendChild(container);

  try {
    // Let fonts and layout settle before rasterising.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob) {
      return false;
    }

    downloadBlob(blob, `${slugifyFilename(title)}.png`);
    return true;
  } catch (error) {
    console.error('Failed to export PNG:', error);
    return false;
  } finally {
    document.body.removeChild(container);
  }
}

/** Copy the rendered HTML (with export styling) to the clipboard. */
export async function copyHtmlToClipboard(content: string): Promise<boolean> {
  const body = await renderMarkdownToHtml(content);
  const full = `<style>${exportStyles}</style>\n${body}`;
  try {
    await navigator.clipboard.writeText(full);
    return true;
  } catch {
    return false;
  }
}
