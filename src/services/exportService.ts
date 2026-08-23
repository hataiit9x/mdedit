// Legacy export entry points that are not superseded by exportUtils.ts.
// Rich HTML/PDF/DOCX/PNG exports live in ./exportUtils.

import * as XLSX from 'xlsx';
import { parseMarkdownTables } from '../utils/markdownUtils';
import { downloadBlob, downloadTextFile, slugifyFilename } from '../utils/files';

export { downloadBlob, slugifyFilename };

// 1. Export as Raw Markdown
export function exportAsMarkdown(title: string, content: string) {
  downloadTextFile(content, `${slugifyFilename(title)}.md`, 'text/markdown');
}

// 2. Export as Plain Text
export function exportAsPlainText(title: string, content: string) {
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

  downloadTextFile(plainText, `${slugifyFilename(title)}.txt`, 'text/plain');
}

// 3. Export Markdown Tables to CSV & XLSX (one sheet/file per table)
export function exportTablesToSpreadsheet(title: string, markdown: string, format: 'xlsx' | 'csv' = 'xlsx'): boolean {
  const parsedTables = parseMarkdownTables(markdown);
  if (parsedTables.length === 0) {
    return false;
  }

  const baseFilename = slugifyFilename(title);

  if (format === 'csv') {
    parsedTables.forEach((table, index) => {
      const csvRows = [table.headers.map(escapeCsvCell).join(',')];
      table.rows.forEach((row) => {
        csvRows.push(row.map(escapeCsvCell).join(','));
      });
      const csvContent = csvRows.join('\n');
      const filename = parsedTables.length > 1 ? `${baseFilename}_table_${index + 1}.csv` : `${baseFilename}_table.csv`;
      downloadTextFile(csvContent, filename, 'text/csv');
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

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}
