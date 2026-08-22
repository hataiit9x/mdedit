import React, { useState } from 'react';
import { TocItem } from '../types';
import { ListTree, X, Hash, Search, Copy, Check, ChevronRight } from 'lucide-react';

interface TableOfContentsProps {
  toc: TocItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectHeading: (id: string, text: string) => void;
  languageTitle?: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  toc,
  isOpen,
  onClose,
  onSelectHeading,
  languageTitle = 'Mục lục tài liệu',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredToc = searchQuery.trim()
    ? toc.filter((item) =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : toc;

  const handleCopyOutline = () => {
    if (toc.length === 0) return;
    const outlineMarkdown = toc
      .map((item) => `${'  '.repeat(Math.max(0, item.level - 1))}- ${item.text}`)
      .join('\n');
    navigator.clipboard.writeText(outlineMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="toc-drawer-panel"
      className="w-72 sm:w-80 flex flex-col h-full border-l border-slate-200 bg-white z-20 text-slate-800 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <ListTree className="w-4 h-4 text-indigo-600" />
          <span>{languageTitle}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold font-mono">
            {toc.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {toc.length > 0 && (
            <button
              onClick={handleCopyOutline}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Sao chép dàn ý Markdown"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Đóng mục lục"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input for large documents */}
      {toc.length > 3 && (
        <div className="p-2.5 border-b border-slate-100 bg-slate-50/40">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus-within:border-indigo-400 transition-colors">
            <Search className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lọc tiêu đề..."
              className="w-full bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Headings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {toc.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-semibold text-slate-600">Chưa có tiêu đề nào</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Thêm # hoặc ## trong tài liệu Markdown để tạo mục lục tự động.
            </p>
          </div>
        ) : filteredToc.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Không tìm thấy tiêu đề phù hợp với "{searchQuery}"
          </div>
        ) : (
          filteredToc.map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => onSelectHeading(item.id, item.text)}
              className="w-full text-left rounded-lg px-2 py-1.5 text-xs text-slate-650 hover:text-indigo-700 hover:bg-indigo-50/70 transition-colors flex items-center gap-2 group cursor-pointer border border-transparent hover:border-indigo-100"
              style={{ paddingLeft: `${Math.max(8, (item.level - 1) * 14 + 8)}px` }}
            >
              <span className="text-[10px] font-mono font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors bg-slate-100 group-hover:bg-indigo-100 px-1 py-0.2 rounded shrink-0">
                H{item.level}
              </span>
              <span className="truncate flex-1 font-medium text-slate-700 group-hover:text-indigo-900">
                {item.text}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
