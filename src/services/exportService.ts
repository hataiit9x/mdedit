import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { parseMarkdownTables } from '../utils/markdownUtils';

// Helper to trigger browser file download
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 1. Export as Raw Markdown
export function exportAsMarkdown(title: string, content: string) {
  const filename = `${sanitizeFilename(title)}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, filename);
}

// 2. Export as Plain Text
export function exportAsPlainText(title: string, content: string) {
  const filename = `${sanitizeFilename(title)}.txt`;
  // Strip common markdown symbols
  const plainText = content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '• ');

  const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}

// 3. Export as Standalone HTML
export function exportAsHtml(title: string, previewElement: HTMLElement) {
  const filename = `${sanitizeFilename(title)}.html`;
  const renderedContent = previewElement ? previewElement.innerHTML : '<p>Empty Document</p>';

  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - MDEdit</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">
  <style>
    :root {
      color-scheme: light dark;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      max-width: 860px;
      margin: 40px auto;
      padding: 0 24px;
      color: #24292f;
      background-color: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      body {
        color: #e6edf3;
        background-color: #0d1117;
      }
      a { color: #58a6ff; }
      pre, code { background-color: #161b22; }
      blockquote { border-left-color: #30363d; color: #8b949e; }
      table th, table td { border-color: #30363d; }
      table tr:nth-child(2n) { background-color: #161b22; }
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 12px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 85%; padding: 0.2em 0.4em; border-radius: 6px; background-color: rgba(175,184,193,0.2); }
    pre { padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; border-radius: 8px; background-color: #f6f8fa; }
    pre code { background-color: transparent; padding: 0; }
    blockquote { padding: 0 1em; color: #57606a; border-left: 0.25em solid #d0d7de; margin: 16px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    table th, table td { border: 1px solid #d0d7de; padding: 6px 13px; }
    table tr:nth-child(2n) { background-color: #f6f8fa; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #d0d7de; border: 0; }
    .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
  </style>
</head>
<body>
  <article class="markdown-body">
    ${renderedContent}
  </article>
</body>
</html>`;

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, filename);
}

// 4. Export as Print-Optimized PDF
export function exportAsPdf() {
  window.print();
}

// 5. Export as High-Res PNG Image
export async function exportAsPng(title: string, previewElement: HTMLElement, isDark: boolean): Promise<boolean> {
  if (!previewElement) return false;
  try {
    const dataUrl = await toPng(previewElement, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: isDark ? '#09090b' : '#ffffff',
    });
    const filename = `${sanitizeFilename(title)}.png`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Failed to export PNG', err);
    return false;
  }
}

// 6. Export Markdown Tables to CSV & XLSX
export function exportTablesToSpreadsheet(title: string, markdown: string, format: 'xlsx' | 'csv' = 'xlsx'): boolean {
  const parsedTables = parseMarkdownTables(markdown);
  if (parsedTables.length === 0) {
    return false;
  }

  const baseFilename = sanitizeFilename(title);

  if (format === 'csv') {
    parsedTables.forEach((table, index) => {
      const csvRows = [table.headers.map(escapeCsvCell).join(',')];
      table.rows.forEach((row) => {
        csvRows.push(row.map(escapeCsvCell).join(','));
      });
      const csvContent = csvRows.join('\n');
      const filename = parsedTables.length > 1 ? `${baseFilename}_table_${index + 1}.csv` : `${baseFilename}_table.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, filename);
    });
    return true;
  } else {
    // XLSX Workbook with each table on its own sheet
    const workbook = XLSX.utils.book_new();
    parsedTables.forEach((table, index) => {
      const data = [table.headers, ...table.rows];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const sheetName = `Table ${index + 1}`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    XLSX.writeFile(workbook, `${baseFilename}_tables.xlsx`);
    return true;
  }
}

// 7. Export as Microsoft Word DOCX
export async function exportAsDocx(title: string, markdown: string): Promise<boolean> {
  try {
    const filename = `${sanitizeFilename(title)}.docx`;
    const docxElements = parseMarkdownToDocx(markdown);

    const doc = new Document({
      title: title,
      sections: [
        {
          properties: {},
          children: docxElements,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
    return true;
  } catch (err) {
    console.error('Error generating DOCX document', err);
    return false;
  }
}

// Parse markdown to DOCX elements
function parseMarkdownToDocx(markdown: string): any[] {
  const lines = markdown.split('\n');
  const elements: any[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block check
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeBuffer.join('\n'),
                font: 'Courier New',
                size: 20,
              }),
            ],
            spacing: { before: 120, after: 120 },
          })
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Empty line
    if (!trimmed) {
      elements.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      elements.push(
        new Paragraph({
          text: trimmed.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      elements.push(
        new Paragraph({
          text: trimmed.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      elements.push(
        new Paragraph({
          text: trimmed.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }

    // Heading 4-6
    if (trimmed.match(/^#{4,6}\s+/)) {
      const clean = trimmed.replace(/^#{4,6}\s+/, '');
      elements.push(
        new Paragraph({
          text: clean,
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 120, after: 60 },
        })
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.slice(2),
              italics: true,
              color: '555555',
            }),
          ],
          indent: { left: 720 },
          spacing: { before: 80, after: 80 },
        })
      );
      continue;
    }

    // Bullet list
    if (trimmed.match(/^[-*+]\s+/)) {
      const text = trimmed.replace(/^[-*+]\s+/, '');
      elements.push(
        new Paragraph({
          children: parseInlineDocxText(text),
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
      continue;
    }

    // Numbered list
    if (trimmed.match(/^\d+\.\s+/)) {
      const text = trimmed.replace(/^\d+\.\s+/, '');
      elements.push(
        new Paragraph({
          children: parseInlineDocxText(text),
          numbering: { reference: 'default-numbered', level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
      continue;
    }

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [trimmed];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].trim().endsWith('|')) {
        i++;
        tableLines.push(lines[i].trim());
      }
      const tableElement = createDocxTable(tableLines);
      if (tableElement) {
        elements.push(tableElement);
      }
      continue;
    }

    // Standard Paragraph
    elements.push(
      new Paragraph({
        children: parseInlineDocxText(line),
        spacing: { before: 60, after: 60 },
      })
    );
  }

  return elements;
}

function parseInlineDocxText(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Simple regex parser for bold, italic, code
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  tokens.forEach((token) => {
    if (!token) return;
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    } else if (token.startsWith('`') && token.endsWith('`')) {
      runs.push(new TextRun({ text: token.slice(1, -1), font: 'Courier New', size: 18 }));
    } else {
      runs.push(new TextRun({ text: token }));
    }
  });

  return runs;
}

function createDocxTable(tableLines: string[]): Table | null {
  if (tableLines.length < 2) return null;
  const parseRow = (line: string) => line.slice(1, -1).split('|').map((c) => c.trim());
  const headerCells = parseRow(tableLines[0]);
  const rows: TableRow[] = [];

  // Header Row
  rows.push(
    new TableRow({
      tableHeader: true,
      children: headerCells.map(
        (header) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            shading: { fill: 'EAEAEA' },
          })
      ),
    })
  );

  // Data rows (skipping delimiter row 1)
  for (let r = 2; r < tableLines.length; r++) {
    const cells = parseRow(tableLines[r]);
    while (cells.length < headerCells.length) cells.push('');
    rows.push(
      new TableRow({
        children: cells.slice(0, headerCells.length).map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({ text: cell })],
            })
        ),
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
    },
  });
}

function sanitizeFilename(title: string): string {
  return (title || 'untitled')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}
