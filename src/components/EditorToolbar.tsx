import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Code,
  FileCode,
  Quote,
  List,
  ListOrdered,
  ListTodo,
  Table,
  Link,
  Image,
  Minus,
  Sigma,
  GitBranch,
  Undo,
  Redo,
  Sparkles,
  ChevronDown,
  Loader2,
  Square,
} from 'lucide-react';
import { translations } from '../utils/i18n';
import { Language, AiActionType, TranslationTargetLanguage } from '../types';
import { AiWritingDropdown } from './AiWritingDropdown';

interface EditorToolbarProps {
  language: Language;
  onFormat: (action: string) => void;
  onOpenTableModal: () => void;
  onOpenAiAssistant: () => void;
  onSelectAiAction?: (action: AiActionType, targetLanguage?: TranslationTargetLanguage) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedText?: string;
  activeModel?: string;
  isAiStreaming?: boolean;
  onStopAiStream?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  language,
  onFormat,
  onOpenTableModal,
  onOpenAiAssistant,
  onSelectAiAction,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  selectedText = '',
  activeModel,
  isAiStreaming = false,
  onStopAiStream,
}) => {
  const t = translations[language].toolbar;
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);
  const aiTriggerRef = useRef<HTMLDivElement>(null);

  const toolGroups = [
    {
      name: 'history',
      tools: [
        { id: 'undo', icon: Undo, label: t.undo, onClick: onUndo, disabled: !canUndo },
        { id: 'redo', icon: Redo, label: t.redo, onClick: onRedo, disabled: !canRedo },
      ],
    },
    {
      name: 'headings',
      tools: [
        { id: 'h1', icon: Heading1, label: t.h1, onClick: () => onFormat('h1') },
        { id: 'h2', icon: Heading2, label: t.h2, onClick: () => onFormat('h2') },
        { id: 'h3', icon: Heading3, label: t.h3, onClick: () => onFormat('h3') },
      ],
    },
    {
      name: 'inline',
      tools: [
        { id: 'bold', icon: Bold, label: t.bold, onClick: () => onFormat('bold') },
        { id: 'italic', icon: Italic, label: t.italic, onClick: () => onFormat('italic') },
        { id: 'strike', icon: Strikethrough, label: t.strikethrough, onClick: () => onFormat('strike') },
        { id: 'code', icon: Code, label: t.code, onClick: () => onFormat('code') },
      ],
    },
    {
      name: 'blocks',
      tools: [
        { id: 'quote', icon: Quote, label: t.blockquote, onClick: () => onFormat('quote') },
        { id: 'codeblock', icon: FileCode, label: t.codeBlock, onClick: () => onFormat('codeblock') },
        { id: 'ul', icon: List, label: t.bulletList, onClick: () => onFormat('ul') },
        { id: 'ol', icon: ListOrdered, label: t.orderedList, onClick: () => onFormat('ol') },
        { id: 'task', icon: ListTodo, label: t.taskList, onClick: () => onFormat('task') },
      ],
    },
    {
      name: 'inserts',
      tools: [
        { id: 'table', icon: Table, label: t.table, onClick: onOpenTableModal },
        { id: 'link', icon: Link, label: t.link, onClick: () => onFormat('link') },
        { id: 'image', icon: Image, label: t.image, onClick: () => onFormat('image') },
        { id: 'hr', icon: Minus, label: t.hr, onClick: () => onFormat('hr') },
        { id: 'math', icon: Sigma, label: t.math, onClick: () => onFormat('math') },
        { id: 'mermaid', icon: GitBranch, label: t.mermaid, onClick: () => onFormat('mermaid') },
      ],
    },
  ];

  return (
    <div className="relative flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-slate-200 bg-slate-50/90 select-none text-slate-700">
      {/* Quick AI Writing Assistant Trigger with Radix Dropdown */}
      <div ref={aiTriggerRef} className="relative inline-block">
        {isAiStreaming ? (
          <button
            onClick={onStopAiStream}
            className="flex items-center gap-1.5 px-2.5 py-1 mr-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all transform active:scale-95 cursor-pointer animate-pulse"
            title="Dừng AI tạo văn bản"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Dừng viết</span>
            <Loader2 className="w-3 h-3 animate-spin ml-0.5" />
          </button>
        ) : (
          <button
            id="radix-gemini-trigger"
            aria-haspopup="menu"
            aria-expanded={isAiDropdownOpen}
            onClick={() => setIsAiDropdownOpen(!isAiDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 mr-1 text-xs font-semibold rounded-lg transition-all transform active:scale-95 cursor-pointer shadow-xs ${
              isAiDropdownOpen
                ? 'bg-indigo-700 text-white shadow-indigo-600/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Trợ lý viết Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
            {selectedText ? (
              <span className="hidden sm:inline-block ml-0.5 px-1.5 py-0.2 text-[10px] rounded bg-white/20">
                Đã chọn
              </span>
            ) : null}
          </button>
        )}

        {/* Floating Radix Menu */}
        <AiWritingDropdown
          isOpen={isAiDropdownOpen}
          onClose={() => setIsAiDropdownOpen(false)}
          hasSelection={Boolean(selectedText && selectedText.trim().length > 0)}
          onSelectAction={(action, lang) => {
            if (onSelectAiAction) {
              onSelectAiAction(action, lang);
            }
          }}
          onOpenAdvancedModal={onOpenAiAssistant}
          activeModelName={activeModel}
        />
      </div>

      <div className="h-4 w-px bg-slate-200 mx-1" />

      {toolGroups.map((group, groupIdx) => (
        <React.Fragment key={group.name}>
          <div className="flex items-center gap-0.5">
            {group.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={tool.onClick}
                  disabled={tool.disabled}
                  title={tool.label}
                  className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          {groupIdx < toolGroups.length - 1 && (
            <div className="h-3.5 w-px bg-slate-200 mx-0.5" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
