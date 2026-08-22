import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose, language }) => {
  const t = translations[language].shortcutsModal;

  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: t.formatting,
      shortcuts: [
        { keys: ['Ctrl / ⌘', 'B'], label: t.bold },
        { keys: ['Ctrl / ⌘', 'I'], label: t.italic },
        { keys: ['Ctrl / ⌘', 'K'], label: t.link },
        { keys: ['Tab'], label: 'Thụt đầu dòng (2 spaces)' },
        { keys: ['Shift', 'Tab'], label: 'Lùi đầu dòng' },
      ],
    },
    {
      title: t.actions,
      shortcuts: [
        { keys: ['Ctrl / ⌘', 'Shift', 'A'], label: t.aiAssistant },
        { keys: ['Ctrl / ⌘', 'F'], label: t.find },
        { keys: ['Ctrl / ⌘', 'S'], label: t.save },
        { keys: ['F11'], label: t.focus },
        { keys: ['Ctrl / ⌘', 'Z'], label: t.undo },
        { keys: ['Ctrl / ⌘', 'Y'], label: t.redo },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {shortcutSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                {section.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <span className="font-medium text-slate-700">{sc.label}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-800 font-mono text-[10px] shadow-xs font-semibold"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
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
