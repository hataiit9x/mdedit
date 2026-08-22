import React, { useState } from 'react';
import { Table, X } from 'lucide-react';
import { generateMarkdownTable } from '../utils/markdownUtils';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface TableGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (tableMarkdown: string) => void;
  language: Language;
}

export const TableGeneratorModal: React.FC<TableGeneratorModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
  language,
}) => {
  const t = translations[language].tableModal;
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);

  if (!isOpen) return null;

  const handleInsert = () => {
    const tableMd = generateMarkdownTable(rows, cols);
    onInsertTable(tableMd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Table className="w-4 h-4 text-indigo-600" />
            <span>{t.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Grid Selector */}
        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-2 block text-center font-semibold font-mono">
            {hoverRow > 0 ? `${hoverRow} hàng × ${hoverCol} cột` : `${rows} hàng × ${cols} cột`}
          </label>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            {Array.from({ length: 6 }, (_, r) => (
              <div key={r} className="flex gap-1.5">
                {Array.from({ length: 6 }, (_, c) => {
                  const isHovered = r < hoverRow && c < hoverCol;
                  const isSelected = r < rows && c < cols;
                  return (
                    <button
                      key={c}
                      type="button"
                      onMouseEnter={() => {
                        setHoverRow(r + 1);
                        setHoverCol(c + 1);
                      }}
                      onMouseLeave={() => {
                        setHoverRow(0);
                        setHoverCol(0);
                      }}
                      onClick={() => {
                        setRows(r + 1);
                        setCols(c + 1);
                      }}
                      className={`w-6 h-6 rounded-md border transition-all cursor-pointer ${
                        isHovered || isSelected
                          ? 'bg-indigo-500 border-indigo-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-400'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Manual Number Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
          <div>
            <label className="text-slate-600 font-medium block mb-1">{t.rows}</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div>
            <label className="text-slate-600 font-medium block mb-1">{t.cols}</label>
            <input
              type="number"
              min={1}
              max={12}
              value={cols}
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleInsert}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            {t.insertBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
