import React, { useEffect, useRef } from 'react';
import {
  FileText,
  FileCode,
  Globe,
  Image as ImageIcon,
  Table as TableIcon,
  FileType2,
  FileSpreadsheet,
  Copy,
  Settings,
  ChevronRight,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';

export interface ExportMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPdf: () => void;
  onExportWord: () => void;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
  onExportPng: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onExportPlainText: () => void;
  onCopyHtml: () => void;
  onOpenAdvancedModal: () => void;
  language: Language;
  hasTables?: boolean;
}

export const ExportMenuDropdown: React.FC<ExportMenuDropdownProps> = ({
  isOpen,
  onClose,
  onExportPdf,
  onExportWord,
  onExportMarkdown,
  onExportHtml,
  onExportPng,
  onExportExcel,
  onExportCsv,
  onExportPlainText,
  onCopyHtml,
  onOpenAdvancedModal,
  language,
  hasTables = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  const isVi = language === 'vi';

  return (
    <div className="relative">
      <div
        ref={menuRef}
        role="menu"
        aria-orientation="vertical"
        id="gemini-export-menu"
        className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-2xl z-50 animate-in fade-in-80 zoom-in-95 select-none"
        style={{
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.14), 0 0 1px 1px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header - Gemini AI Style */}
        <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              {isVi ? 'Xuất tài liệu (Export)' : 'Export Document'}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {isVi ? 'Đa định dạng' : 'Multi-format'}
          </span>
        </div>

        {/* Primary Document Formats */}
        <div className="space-y-0.5 text-xs">
          {/* 1. PDF */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportPdf)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{isVi ? 'Tài liệu PDF' : 'PDF Document'}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">.pdf</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isVi ? 'Trang in chuẩn, giữ font & định dạng' : 'Print-ready layout with custom styling'}
              </div>
            </div>
          </button>

          {/* 2. Word (.docx) */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportWord)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 shrink-0">
              <FileType2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{isVi ? 'Microsoft Word' : 'Microsoft Word'}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">.docx</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isVi ? 'Tài liệu Word có cấu trúc tiêu đề & bảng' : 'Editable Word doc with headings and tables'}
              </div>
            </div>
          </button>

          {/* 3. Markdown (.md) */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportMarkdown)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{isVi ? 'Mã nguồn Markdown' : 'Markdown Source'}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">.md</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isVi ? 'Tệp văn bản thuần định dạng Markdown gốc' : 'Standard raw markdown text file'}
              </div>
            </div>
          </button>

          {/* 4. HTML (.html) */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportHtml)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{isVi ? 'Trang web HTML' : 'Standalone HTML'}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">.html</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isVi ? 'Trang web độc lập có KaTeX & CSS' : 'Standalone page with embedded math & styles'}
              </div>
            </div>
          </button>

          {/* 5. PNG Image (.png) */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportPng)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-100 shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{isVi ? 'Ảnh chụp xem trước' : 'PNG Image'}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">.png</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isVi ? 'Chụp ảnh độ phân giải cao' : 'High resolution preview snapshot'}
              </div>
            </div>
          </button>

          {/* Tables Section (if table exists) */}
          <div className="my-1 border-t border-slate-100" />
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {isVi ? 'Dữ liệu bảng biểu & Tiện ích' : 'Tables & Utilities'}
          </div>

          {/* 6. Excel (.xlsx) */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportExcel)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-100 shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="font-medium text-slate-800">{isVi ? 'Xuất bảng sang Excel' : 'Export Tables to Excel'}</span>
              <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-teal-50 text-teal-700">.xlsx</span>
            </div>
          </button>

          {/* 7. CSV (.csv) */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportCsv)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-100 shrink-0">
              <TableIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="font-medium text-slate-800">{isVi ? 'Xuất bảng sang CSV' : 'Export Tables to CSV'}</span>
              <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-cyan-50 text-cyan-700">.csv</span>
            </div>
          </button>

          {/* 8. Plain text (.txt) */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onExportPlainText)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="font-medium text-slate-800">{isVi ? 'Văn bản thuần' : 'Plain Text'}</span>
              <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-50 text-amber-700">.txt</span>
            </div>
          </button>

          {/* 9. Copy HTML */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onCopyHtml)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-200 shrink-0">
              <Copy className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="font-medium text-slate-800">{isVi ? 'Sao chép HTML đã render' : 'Copy Rendered HTML'}</span>
            </div>
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-slate-100" />

          {/* Advanced Export Modal Trigger */}
          <button
            role="menuitem"
            onClick={() => handleItemClick(onOpenAdvancedModal)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              <span>{isVi ? 'Tùy chọn xuất nâng cao...' : 'Advanced Export Options...'}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </div>
    </div>
  );
};
