import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Check,
  FileText,
  Expand as ExpandIcon,
  ListTree,
  PenLine,
  Lightbulb,
  Languages,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { AiActionType, TranslationTargetLanguage } from '../types';

export interface AiWritingDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  hasSelection: boolean;
  onSelectAction: (action: AiActionType, targetLanguage?: TranslationTargetLanguage) => void;
  onOpenAdvancedModal: () => void;
  activeModelName?: string;
  triggerRect?: DOMRect | null;
}

const TRANSLATION_LANGUAGES: { label: string; code: TranslationTargetLanguage }[] = [
  { label: 'Tiếng Việt (Vietnamese)', code: 'Vietnamese' },
  { label: 'English', code: 'English' },
  { label: 'Français (French)', code: 'French' },
  { label: '日本語 (Japanese)', code: 'Japanese' },
  { label: '한국어 (Korean)', code: 'Korean' },
  { label: '中文 (Chinese)', code: 'Chinese' },
  { label: 'Español (Spanish)', code: 'Spanish' },
  { label: 'Deutsch (German)', code: 'German' },
];

export const AiWritingDropdown: React.FC<AiWritingDropdownProps> = ({
  isOpen,
  onClose,
  hasSelection,
  onSelectAction,
  onOpenAdvancedModal,
  activeModelName,
  triggerRect,
}) => {
  const [showTranslateSubmenu, setShowTranslateSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) {
      setShowTranslateSubmenu(false);
      return;
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        (!submenuRef.current || !submenuRef.current.contains(e.target as Node))
      ) {
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

  const handleAction = (action: AiActionType, lang?: TranslationTargetLanguage) => {
    onSelectAction(action, lang);
    onClose();
  };

  return (
    <div className="relative">
      <div
        ref={dropdownRef}
        data-side="bottom"
        data-align="start"
        role="menu"
        aria-orientation="vertical"
        data-state="open"
        data-radix-menu-content=""
        dir="ltr"
        id="radix-gemini-menu"
        className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-2xl z-50 animate-in fade-in-80 zoom-in-95 select-none"
        style={{
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.12), 0 0 1px 1px rgba(0,0,0,0.05)',
        }}
      >
        {/* Header indicator */}
        <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              Gemini AI Actions
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold truncate max-w-[120px]">
            {activeModelName || 'gemini-3.7-flash'}
          </span>
        </div>

        {/* Scope info */}
        <div className="px-3 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasSelection ? 'bg-indigo-500' : 'bg-emerald-500'
            }`}
          />
          <span>
            {hasSelection ? 'Tác vụ cho đoạn văn bản đã chọn' : 'Tác vụ cho toàn bộ tài liệu'}
          </span>
        </div>

        <div className="my-1 border-t border-slate-100" />

        {/* Primary AI Actions */}
        <div className="space-y-0.5 text-xs">
          {/* 1. Improve Writing */}
          <button
            role="menuitem"
            onClick={() => handleAction('improve')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Cải thiện câu chữ</div>
              <div className="text-[10px] text-slate-400 truncate">
                Nâng cao độ mượt mà và từ vựng
              </div>
            </div>
          </button>

          {/* 2. Fix Grammar */}
          <button
            role="menuitem"
            onClick={() => handleAction('grammar')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Sửa chính tả & Ngữ pháp</div>
              <div className="text-[10px] text-slate-400 truncate">
                Sửa toàn bộ lỗi dấu câu và từ ngữ
              </div>
            </div>
          </button>

          {/* 3. Summarize */}
          <button
            role="menuitem"
            onClick={() => handleAction('summarize')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 group-hover:bg-sky-100 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Tóm tắt nội dung</div>
              <div className="text-[10px] text-slate-400 truncate">
                Rút gọn ý chính ngắn gọn, súc tích
              </div>
            </div>
          </button>

          {/* 4. Expand */}
          <button
            role="menuitem"
            onClick={() => handleAction('expand')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 shrink-0">
              <ExpandIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Mở rộng chi tiết</div>
              <div className="text-[10px] text-slate-400 truncate">
                Bổ sung ví dụ và giải thích sâu hơn
              </div>
            </div>
          </button>

          {/* 5. Create Outline */}
          <button
            role="menuitem"
            onClick={() => handleAction('outline')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 shrink-0">
              <ListTree className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Tạo dàn ý (Outline)</div>
              <div className="text-[10px] text-slate-400 truncate">
                Cấu trúc các đề mục Markdown mạch lạc
              </div>
            </div>
          </button>

          {/* 6. Continue Writing */}
          <button
            role="menuitem"
            onClick={() => handleAction('continue')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 shrink-0">
              <PenLine className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Viết tiếp đoạn văn</div>
              <div className="text-[10px] text-slate-400 truncate">
                AI sáng tạo tiếp liền mạch văn phong
              </div>
            </div>
          </button>

          {/* 7. Simplify */}
          <button
            role="menuitem"
            onClick={() => handleAction('simplify')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-100 shrink-0">
              <Lightbulb className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Giải thích đơn giản</div>
              <div className="text-[10px] text-slate-400 truncate">
                Diễn giải bằng ngôn ngữ dễ hiểu
              </div>
            </div>
          </button>

          {/* 8. Translate Submenu Trigger */}
          <div
            className="relative"
            onMouseEnter={() => setShowTranslateSubmenu(true)}
            onMouseLeave={() => setShowTranslateSubmenu(false)}
          >
            <button
              role="menuitem"
              onClick={() => setShowTranslateSubmenu(!showTranslateSubmenu)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 shrink-0">
                  <Languages className="w-3.5 h-3.5" />
                </div>
                <div className="font-semibold text-slate-900">Dịch thuật sang...</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
            </button>

            {/* Radix Nested Submenu */}
            {showTranslateSubmenu && (
              <div
                ref={submenuRef}
                className="absolute left-full top-0 ml-1.5 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-2xl z-50 animate-in fade-in-80 zoom-in-95 select-none"
                style={{
                  boxShadow: '0 20px 40px -15px rgba(0,0,0,0.12), 0 0 1px 1px rgba(0,0,0,0.05)',
                }}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Chọn ngôn ngữ đích
                </div>
                <div className="space-y-0.5">
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      role="menuitem"
                      onClick={() => handleAction('translate', lang.code)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-700 hover:text-indigo-900 hover:bg-indigo-50 font-medium transition-colors cursor-pointer"
                    >
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="my-1.5 border-t border-slate-100" />

        {/* Custom Prompt & Advanced Modal Trigger */}
        <button
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenAdvancedModal();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
          <span>Yêu cầu tùy chỉnh & Hộp thoại AI...</span>
        </button>
      </div>
    </div>
  );
};
