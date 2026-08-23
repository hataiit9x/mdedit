import React, { forwardRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Copy, Check, FileSpreadsheet, Download } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import * as XLSX from 'xlsx';
import { downloadBlob } from '../services/exportService';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

interface MarkdownPreviewProps {
  content: string;
  isDark?: boolean;
  fontSize?: number;
  fontFamily?: 'sans' | 'serif' | 'mono';
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

// react-markdown v10 removed the `inline` prop on `code`: an inline span is
// simply one without a `language-*` className (rehype-highlight adds the
// class to fenced blocks only). Extracting copy-text from the hast `node`
// also survives syntax highlighting (children are React elements, so
// String(children) used to produce "[object Object]").
function hastText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return typeof node.value === 'string' ? node.value : '';
  if (Array.isArray(node.children)) return node.children.map(hastText).join('');
  return '';
}

const SAFE_HREF = /^(https?:|mailto:|tel:|#|\/)/i;

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  ({ content, fontSize = 15, fontFamily = 'sans', onScroll }, ref) => {
    const fontClass =
      fontFamily === 'serif'
        ? 'font-serif'
        : fontFamily === 'mono'
        ? 'font-mono'
        : 'font-sans';

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        id="markdown-preview-pane"
        className={`h-full overflow-y-auto px-6 sm:px-10 py-8 bg-white text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 ${fontClass}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className="max-w-4xl mx-auto space-y-4">
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeSlug]}
            components={{
              // Heading ids come from rehype-slug (github-slugger), matching
              // extractToc() in utils/markdownUtils.ts so TOC jumps land right.
              h1: ({ children, ...props }) => (
                <h1
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 pt-6 pb-2 border-b border-slate-200 scroll-mt-6"
                  {...props}
                >
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }) => (
                <h2
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 pt-5 pb-1.5 border-b border-slate-200 scroll-mt-6"
                  {...props}
                >
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }) => (
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 pt-4 pb-1 scroll-mt-6" {...props}>
                  {children}
                </h3>
              ),
              h4: ({ children, ...props }) => (
                <h4 className="text-base font-bold text-slate-800 pt-3" {...props}>
                  {children}
                </h4>
              ),
              p: ({ children, ...props }) => (
                <p className="leading-relaxed text-slate-700 my-3" {...props}>
                  {children}
                </p>
              ),
              ul: ({ children, ...props }) => (
                <ul className="list-disc pl-6 my-3 space-y-1.5 text-slate-700" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol className="list-decimal pl-6 my-3 space-y-1.5 text-slate-700" {...props}>
                  {children}
                </ol>
              ),
              li: ({ children, ...props }) => (
                <li className="leading-relaxed text-slate-700" {...props}>
                  {children}
                </li>
              ),
              blockquote: ({ children, ...props }) => (
                <blockquote
                  className="border-l-4 border-indigo-500 pl-4 py-2 my-4 italic text-slate-700 bg-indigo-50/40 rounded-r-xl"
                  {...props}
                >
                  {children}
                </blockquote>
              ),
              hr: ({ ...props }) => <hr className="my-8 border-t border-slate-200" {...props} />,
              a: ({ children, href, ...props }) => {
                // Only allow well-known schemes — blocks javascript: and
                // other exotic URLs injected through markdown links.
                const safeHref = typeof href === 'string' && SAFE_HREF.test(href.trim()) ? href : undefined;
                return (
                  <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 font-medium underline underline-offset-4 decoration-indigo-300 hover:text-indigo-800 transition-colors"
                    {...(safeHref ? props : {})}
                  >
                    {children}
                  </a>
                );
              },
              code: ({ className, children, node, ...props }: any) => {
                const isInline = !className;
                const languageMatch = /language-(\w+)/.exec(className || '');
                const language = languageMatch ? languageMatch[1] : '';
                const codeString = hastText(node).replace(/\n$/, '');

                if (!isInline && language === 'mermaid') {
                  return <MermaidDiagram code={codeString} isDark={false} />;
                }

                if (!isInline) {
                  return <CodeBlock language={language} code={codeString}>{children}</CodeBlock>;
                }

                return (
                  <code
                    className="px-1.5 py-0.5 rounded-md font-mono text-[0.9em] bg-slate-100 text-pink-600 border border-slate-200 font-medium"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              table: ({ children, ...props }) => {
                return <EnhancedTable {...props}>{children}</EnhancedTable>;
              },
              th: ({ children, ...props }) => (
                <th
                  className="border border-slate-200 bg-slate-100 px-4 py-2.5 text-left font-bold text-slate-900"
                  {...props}
                >
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td className="border border-slate-200 px-4 py-2 text-slate-700 bg-white" {...props}>
                  {children}
                </td>
              ),
              img: ({ src, alt, ...props }) => (
                <img
                  src={src}
                  alt={alt || 'Image'}
                  className="rounded-xl my-4 max-w-full h-auto shadow-sm border border-slate-200"
                  referrerPolicy="no-referrer"
                  {...props}
                />
              ),
            }}
          >
            {content || '*Không có nội dung để xem trước*'}
          </Markdown>
        </div>
      </div>
    );
  }
);

MarkdownPreview.displayName = 'MarkdownPreview';

function CodeBlock({
  language,
  code,
  children,
}: {
  language: string;
  code: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-5 rounded-xl border border-slate-200 bg-[#f8fafc] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-500 font-mono">
        <span className="uppercase tracking-wider text-[11px] font-semibold text-slate-600">
          {language || 'code'}
        </span>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer text-xs border border-slate-200"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
      </div>
      {/* `children` keeps the rehype-highlight spans so syntax colors render */}
      <div className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-slate-800">
        <code>{children}</code>
      </div>
    </div>
  );
}

function EnhancedTable({ children }: { children: React.ReactNode }) {
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = React.useRef<HTMLTableElement>(null);

  const exportCurrentTable = (format: 'xlsx' | 'csv') => {
    if (!tableRef.current) return;
    setIsExporting(true);
    try {
      const table = tableRef.current;
      const rows = Array.from(table.querySelectorAll('tr'));
      const data = rows.map((row) =>
        Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() || '')
      );

      if (format === 'csv') {
        const csvContent = data.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `table_export_${Date.now()}.csv`);
      } else {
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Table');
        XLSX.writeFile(wb, `table_export_${Date.now()}.xlsx`);
      }
    } catch (e) {
      console.error('Failed to export table', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative group my-5">
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
        <table ref={tableRef} className="w-full text-sm border-collapse">
          {children}
        </table>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-md text-xs">
        <button
          onClick={() => exportCurrentTable('csv')}
          disabled={isExporting}
          className="flex items-center gap-1 px-2 py-1 text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          title="Xuất bảng này ra CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>
        <button
          onClick={() => exportCurrentTable('xlsx')}
          disabled={isExporting}
          className="flex items-center gap-1 px-2 py-1 text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer font-medium"
          title="Xuất bảng này ra Excel XLSX"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>XLSX</span>
        </button>
      </div>
    </div>
  );
}
