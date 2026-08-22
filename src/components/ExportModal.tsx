import React, { useState } from 'react';
import {
  Download,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image,
  Printer,
  File,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';
import {
  exportAsMarkdown,
  exportAsPlainText,
  exportAsHtml,
  exportAsPdf,
  exportAsPng,
  exportTablesToSpreadsheet,
  exportAsDocx,
} from '../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  previewElementRef: React.RefObject<HTMLDivElement | null>;
  isDark?: boolean;
  language: Language;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentContent,
  previewElementRef,
  language,
}) => {
  const t = translations[language].export;
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (type: string) => {
    setLoadingType(type);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (type === 'pdf') {
        exportAsPdf();
        setSuccessMessage('Đã mở hộp thoại in / lưu PDF của hệ thống.');
      } else if (type === 'md') {
        exportAsMarkdown(documentTitle, documentContent);
        setSuccessMessage('Đã tải xuống tệp .md thành công.');
      } else if (type === 'txt') {
        exportAsPlainText(documentTitle, documentContent);
        setSuccessMessage('Đã tải xuống tệp .txt thành công.');
      } else if (type === 'html') {
        if (!previewElementRef.current) {
          throw new Error('Chưa tìm thấy khung xem trước');
        }
        exportAsHtml(documentTitle, previewElementRef.current);
        setSuccessMessage('Đã tải xuống tệp .html độc lập thành công.');
      } else if (type === 'docx') {
        await exportAsDocx(documentTitle, documentContent);
        setSuccessMessage('Đã tạo và tải xuống tệp Microsoft Word .docx.');
      } else if (type === 'png') {
        if (!previewElementRef.current) {
          throw new Error('Chưa tìm thấy khung xem trước');
        }
        const success = await exportAsPng(documentTitle, previewElementRef.current, false);
        if (success) {
          setSuccessMessage('Đã chụp và tải ảnh PNG xem trước thành công.');
        } else {
          setErrorMessage('Không thể chụp ảnh bản xem trước.');
        }
      } else if (type === 'xlsx' || type === 'csv') {
        const success = exportTablesToSpreadsheet(documentTitle, documentContent, type);
        if (!success) {
          setErrorMessage('Không tìm thấy bảng Markdown nào trong tài liệu này.');
        } else {
          setSuccessMessage(`Đã xuất bảng ra định dạng .${type.toUpperCase()} thành công.`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Xuất tệp thất bại');
    } finally {
      setLoadingType(null);
    }
  };

  const exportOptions = [
    {
      id: 'pdf',
      name: t.pdf,
      desc: t.pdfDesc,
      icon: Printer,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      id: 'docx',
      name: t.docx,
      desc: t.docxDesc,
      icon: File,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      id: 'md',
      name: t.markdown,
      desc: t.markdownDesc,
      icon: FileCode,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      id: 'html',
      name: t.html,
      desc: t.htmlDesc,
      icon: FileCode,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      id: 'png',
      name: t.png,
      desc: t.pngDesc,
      icon: Image,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      id: 'txt',
      name: t.plainText,
      desc: t.plainTextDesc,
      icon: FileText,
      color: 'text-slate-600 bg-slate-100 border-slate-200',
    },
    {
      id: 'xlsx',
      name: 'Excel (.xlsx)',
      desc: t.tablesCsvDesc,
      icon: FileSpreadsheet,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'csv',
      name: 'CSV (.csv)',
      desc: t.tablesCsvDesc,
      icon: FileSpreadsheet,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
              <p className="text-xs text-slate-500">
                Xuất tài liệu: <span className="font-semibold text-slate-800">{documentTitle || 'Tài liệu không tên'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Options Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
          {exportOptions.map((opt) => {
            const Icon = opt.icon;
            const isLoading = loadingType === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => handleExport(opt.id)}
                disabled={isLoading || loadingType !== null}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/90 hover:border-indigo-300 text-left transition-all group disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <div className={`p-2 rounded-xl border ${opt.color} shrink-0`}>
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {opt.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/80">
          <span className="text-[11px] text-slate-400">Không có dữ liệu nào tải lên máy chủ ngoài</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
