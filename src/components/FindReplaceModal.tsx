import React, { useState, useEffect } from 'react';
import { Search, Replace, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-react';
import { Language } from '../types';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editorContent: string;
  onReplace: (newContent: string) => void;
  onHighlightMatch?: (index: number) => void;
  language: Language;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  editorContent,
  onReplace,
  language,
}) => {
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchIndices, setMatchIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!findQuery) {
      setMatchIndices([]);
      setCurrentIndex(0);
      return;
    }

    const indices: number[] = [];
    const flags = matchCase ? 'g' : 'gi';
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    let match;

    while ((match = regex.exec(editorContent)) !== null) {
      indices.push(match.index);
    }

    setMatchIndices(indices);
    setCurrentIndex(0);
  }, [findQuery, matchCase, editorContent]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (matchIndices.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % matchIndices.length);
  };

  const handlePrev = () => {
    if (matchIndices.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + matchIndices.length) % matchIndices.length);
  };

  const handleReplaceOne = () => {
    if (matchIndices.length === 0) return;
    const targetIdx = matchIndices[currentIndex];
    const newContent =
      editorContent.slice(0, targetIdx) +
      replaceQuery +
      editorContent.slice(targetIdx + findQuery.length);
    onReplace(newContent);
  };

  const handleReplaceAll = () => {
    if (!findQuery) return;
    const flags = matchCase ? 'g' : 'gi';
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    const newContent = editorContent.replace(regex, replaceQuery);
    onReplace(newContent);
  };

  return (
    <div className="fixed top-14 right-8 z-40 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl text-slate-800 animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Search className="w-3.5 h-3.5 text-indigo-600" />
          <span>Tìm kiếm & Thay thế</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Find input */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Tìm kiếm từ khóa..."
            className="w-full bg-transparent outline-none text-slate-900 placeholder-slate-400 text-xs"
          />
          <button
            type="button"
            onClick={() => setMatchCase(!matchCase)}
            className={`p-1 rounded transition-colors ${
              matchCase
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Phân biệt chữ hoa/thường"
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Matches counter and nav */}
        {findQuery && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              {matchIndices.length > 0
                ? `${currentIndex + 1} / ${matchIndices.length} kết quả`
                : 'Không có kết quả'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={matchIndices.length === 0}
                className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNext}
                disabled={matchIndices.length === 0}
                className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Replace input */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500">
          <Replace className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="Thay thế bằng..."
            className="w-full bg-transparent outline-none text-slate-900 placeholder-slate-400 text-xs"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            onClick={handleReplaceOne}
            disabled={matchIndices.length === 0}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs disabled:opacity-40"
          >
            Thay thế
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matchIndices.length === 0}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs disabled:opacity-40 shadow-xs"
          >
            Thay thế tất cả ({matchIndices.length})
          </button>
        </div>
      </div>
    </div>
  );
};
