import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading as HeadingIcon,
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
  LayoutTemplate,
  Smile,
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
  onApplyTemplate?: (content: string) => void;
  onInsertSnippet?: (snippet: string) => void;
}

/* ------------------------------------------------------------------ */
/* Click-outside dropdown shell                                        */
/* ------------------------------------------------------------------ */

function ToolbarMenu({
  label,
  icon: Icon,
  children,
  width = 'w-56',
  title,
}: {
  label?: string;
  icon: React.ElementType;
  children: (close: () => void) => React.ReactNode;
  width?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        title={title || label}
        className={`flex items-center gap-1 p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer ${
          open ? 'bg-slate-200/70 text-slate-900' : ''
        }`}
      >
        <Icon className="w-4 h-4" />
        {label && <span className="text-[11px] font-semibold hidden lg:inline-block">{label}</span>}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          className={`absolute top-full left-0 mt-1 ${width} max-h-80 overflow-y-auto z-50 rounded-xl border border-slate-200 bg-white shadow-xl p-1.5 text-xs`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const TEMPLATES: { name: string; icon: string; content: string }[] = [
  {
    name: 'Tài liệu trắng',
    icon: '📄',
    content: `# Tiêu đề tài liệu\n\nMở đầu ngắn gọn về chủ đề...\n\n## Nội dung chính\n\n- Ý thứ nhất\n- Ý thứ hai\n\n## Kết luận\n\nTóm lại...\n`,
  },
  {
    name: 'README GitHub',
    icon: '🚀',
    content: `# Tên Dự Án\n\n![Banner](https://via.placeholder.com/800x200)\n\n> Mô tả ngắn gọn dự án trong một câu.\n\n## ✨ Tính năng\n\n- [x] Tính năng đã hoàn thành\n- [ ] Tính năng đang phát triển\n\n## 🚀 Cài đặt\n\n\`\`\`bash\ngit clone https://github.com/user/repo.git\ncd repo\nnpm install\nnpm run dev\n\`\`\`\n\n## 📘 Cách sử dụng\n\n| Lệnh | Mô tả |\n| --- | --- |\n| \`npm run dev\` | Chạy môi trường phát triển |\n| \`npm run build\` | Build production |\n\n## 🤝 Đóng góp\n\nMọi đóng góp đều được chào đón! Vui lòng mở Issue hoặc Pull Request.\n\n## 📄 Giấy phép\n\nMIT\n`,
  },
  {
    name: 'Báo cáo lỗi (Bug report)',
    icon: '🐛',
    content: `# Báo cáo lỗi\n\n**Mã lỗi:** BUG-001\n**Mức độ:** 🔴 Nghiêm trọng / 🟠 Trung bình / 🟢 Nhẹ\n**Ngày báo cáo:** ${new Date().toLocaleDateString('vi-VN')}\n\n## Mô tả lỗi\n\nMô tả ngắn gọn lỗi gặp phải...\n\n## Các bước tái hiện\n\n1. Mở ứng dụng...\n2. Nhấn vào...\n3. Quan sát lỗi...\n\n## Kết quả mong đợi\n\nỨng dụng phải...\n\n## Kết quả thực tế\n\nỨng dụng lại...\n\n## Môi trường\n\n- Hệ điều hành: \n- Trình duyệt: \n- Phiên bản: \n\n## Ảnh chụp màn hình\n\n![Mô tả ảnh](image-url)\n`,
  },
  {
    name: 'Biên bản họp',
    icon: '📝',
    content: `# Biên bản họp\n\n**Chủ đề:** \n**Thời gian:** ${new Date().toLocaleString('vi-VN')}\n**Địa điểm:** \n**Thành phần tham dự:** \n\n## Nội dung chính\n\n1. \n2. \n\n## Quyết định\n\n- \n\n## Công việc cần làm\n\n| Công việc | Người phụ trách | Hạn hoàn thành | Trạng thái |\n| --- | --- | --- | --- |\n|  |  |  | ⏳ Đang chờ |\n\n## Ghi chú\n\n> \n`,
  },
  {
    name: 'FAQ — Hỏi đáp',
    icon: '❓',
    content: `# Câu hỏi thường gặp (FAQ)\n\n## Câu hỏi thứ nhất?\n\n<details>\n<summary>Xem câu trả lời</summary>\n\nĐáp án chi tiết...\n\n</details>\n\n## Câu hỏi thứ hai?\n\n<details>\n<summary>Xem câu trả lời</summary>\n\nĐáp án chi tiết...\n\n</details>\n`,
  },
  {
    name: 'Demo Toán & Sơ đồ',
    icon: '🧪',
    content: `# Demo công thức & sơ đồ\n\n## Công thức KaTeX\n\nCông thức nội dòng: $E = mc^2$\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n\n$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$\n\n## Sơ đồ Mermaid\n\n\`\`\`mermaid\nflowchart TD\n    A[Bắt đầu] --> B{Điều kiện?}\n    B -->|Đúng| C[Thực hiện A]\n    B -->|Sai| D[Thực hiện B]\n    C --> E[Kết thúc]\n    D --> E\n\`\`\`\n\n## Bảng so sánh\n\n| Tiêu chí | Phương án 1 | Phương án 2 |\n| --- | :---: | :---: |\n| Chi phí | Thấp | Cao |\n| Tốc độ | Chậm | Nhanh |\n`,
  },
];

/* ------------------------------------------------------------------ */
/* Emoji picker                                                        */
/* ------------------------------------------------------------------ */

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉',
  '😊','😍','🥰','😘','😜','🤔','🤗','🤩','😎','🥳',
  '👍','👎','👏','🙌','🤝','💪','✌️','🤞','👋','🙏',
  '❤️','🧡','💛','💚','💙','💜','🔥','✨','⭐','🌟',
  '🎉','🎊','🎁','🏆','🥇','🎯','🚀','💡','📌','📎',
  '✅','❌','⭕','❗','❓','💤','📝','📚','🔧','🛠️',
];

/* ------------------------------------------------------------------ */
/* KaTeX math menu                                                     */
/* ------------------------------------------------------------------ */

const MATH_ITEMS: { label: string; insert: string }[] = [
  { label: '$…$ công thức nội dòng', insert: '$f(x) = x^2$' },
  { label: '$$…$$ khối công thức', insert: '$$\nE = mc^2\n$$' },
  { label: 'a/b — phân số', insert: '$\\frac{a}{b}$' },
  { label: '√x — căn bậc hai', insert: '$\\sqrt{x}$' },
  { label: 'x² — chỉ số trên', insert: '$x^{2}$' },
  { label: 'xᵢ — chỉ số dưới', insert: '$x_{i}$' },
  { label: 'Σ — tổng', insert: '$\\sum_{i=1}^{n} i$' },
  { label: '∫ — tích phân', insert: '$\\int_{a}^{b} f(x)\\,dx$' },
  { label: 'lim — giới hạn', insert: '$\\lim_{x \\to 0} \\frac{\\sin x}{x}$' },
  { label: 'α β θ λ μ σ π Ω', insert: '$\\alpha \\beta \\theta \\lambda \\mu \\sigma \\pi \\Omega$' },
];

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

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
  onApplyTemplate,
  onInsertSnippet,
}) => {
  const t = translations[language].toolbar;
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);

  const toolGroups = [
    {
      name: 'history',
      tools: [
        { id: 'undo', icon: Undo, label: t.undo, onClick: onUndo, disabled: !canUndo },
        { id: 'redo', icon: Redo, label: t.redo, onClick: onRedo, disabled: !canRedo },
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
        { id: 'mermaid', icon: GitBranch, label: t.mermaid, onClick: () => onFormat('mermaid') },
      ],
    },
  ];

  return (
    <div className="relative flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-slate-200 bg-slate-50/90 select-none text-slate-700">
      {/* NOTE: no overflow-x-auto here — a scroll container would clip the
          ToolbarMenu dropdowns (an auto overflow axis forces the other axis
          from visible to auto). Icon-only triggers keep the row narrow. */}
      {/* Quick AI Writing Assistant Trigger */}
      <div className="relative inline-block shrink-0">
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
            title="Trợ lý viết AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
            {/* Reserve space and toggle opacity: mounting/unmounting the badge
                would shift toolbar layout on every selection change. */}
            <span
              className={`hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[10px] rounded bg-white/20 transition-opacity ${
                selectedText ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Đã chọn
            </span>
          </button>
        )}

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
          <div className="flex items-center gap-0.5 shrink-0">
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
          {groupIdx < toolGroups.length - 1 && <div className="h-3.5 w-px bg-slate-200 mx-0.5 shrink-0" />}
        </React.Fragment>
      ))}

      <div className="h-3.5 w-px bg-slate-200 mx-0.5 shrink-0" />

      {/* Headings H1–H6 */}
      <ToolbarMenu icon={HeadingIcon} title="Tiêu đề H1–H6" width="w-44">
        {(close) => (
          <>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <button
                key={level}
                onClick={() => {
                  onFormat(`h${level}`);
                  close();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 font-bold ${
                  level <= 2 ? 'text-slate-900' : 'text-slate-700'
                }`}
                style={{ fontSize: `${1.5 - level * 0.12}rem`, lineHeight: 1.4 }}
              >
                H{level} — Tiêu đề mức {level}
              </button>
            ))}
          </>
        )}
      </ToolbarMenu>

      {/* KaTeX math */}
      <ToolbarMenu icon={Sigma} title="Chèn công thức KaTeX" width="w-64">
        {(close) => (
          <>
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              KaTeX
            </div>
            {MATH_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (onInsertSnippet) onInsertSnippet(item.insert);
                  else onFormat('math');
                  close();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 font-mono text-slate-700"
              >
                {item.label}
              </button>
            ))}
          </>
        )}
      </ToolbarMenu>

      {/* Emoji picker */}
      <ToolbarMenu icon={Smile} title="Chèn emoji" width="w-64">
        {() => (
          <div className="grid grid-cols-10 gap-0.5 p-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  if (onInsertSnippet) onInsertSnippet(emoji);
                }}
                className="p-1 rounded hover:bg-indigo-50 text-base leading-none cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </ToolbarMenu>

      {/* Templates */}
      <ToolbarMenu icon={LayoutTemplate} title="Chèn mẫu tài liệu" width="w-56">
        {(close) => (
          <>
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Mẫu tài liệu
            </div>
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => {
                  if (onApplyTemplate) onApplyTemplate(tpl.content);
                  close();
                }}
                className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-slate-700"
              >
                <span className="text-base leading-none">{tpl.icon}</span>
                <span className="font-medium">{tpl.name}</span>
              </button>
            ))}
          </>
        )}
      </ToolbarMenu>
    </div>
  );
};
