import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowRightToLine } from 'lucide-react';

interface GoToLineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  totalLines: number;
  onGoToLine: (line: number) => void;
}

export const GoToLineDialog: React.FC<GoToLineDialogProps> = ({ isOpen, onClose, totalLines, onGoToLine }) => {
  const [line, setLine] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLine('1');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetLine = parseInt(line, 10);
  const isValid = Number.isInteger(targetLine) && targetLine >= 1 && targetLine <= totalLines;

  const handleGo = () => {
    if (isValid) {
      onGoToLine(targetLine);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl text-slate-800">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <ArrowRightToLine className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nhảy tới dòng</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={totalLines}
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGo();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white outline-none text-slate-900 font-mono"
            placeholder="Số dòng..."
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {isValid ? `Tổng số dòng: ${totalLines}` : `Nhập từ 1 đến ${totalLines}`}
            </span>
            <button
              onClick={handleGo}
              disabled={!isValid}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs disabled:opacity-40 shadow-xs cursor-pointer"
            >
              Đi tới
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
