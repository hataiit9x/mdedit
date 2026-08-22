import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  CheckCircle,
  AlertCircle,
  FileText,
  Maximize2,
  Languages,
  ListOrdered,
  FastForward,
  HelpCircle,
  X,
  Copy,
  Check,
  RotateCcw,
  Key,
  ExternalLink,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { AiActionType, Language, TranslationTargetLanguage } from '../types';
import { translations } from '../utils/i18n';
import { executeAiAction, AVAILABLE_MODELS } from '../services/aiService';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  fullDocumentText: string;
  onApplyReplacement: (newText: string, mode: 'replace' | 'insertBelow') => void;
  onUndoLastReplacement?: () => void;
  canUndo?: boolean;
  apiKey: string;
  defaultModel: string;
  language: Language;
  onOpenSettings: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  selectedText,
  fullDocumentText,
  onApplyReplacement,
  onUndoLastReplacement,
  canUndo = false,
  apiKey,
  defaultModel,
  language,
  onOpenSettings,
}) => {
  const t = translations[language].ai;
  const targetText = selectedText.trim() ? selectedText : fullDocumentText;
  const isSelectionMode = Boolean(selectedText.trim());

  const [selectedAction, setSelectedAction] = useState<AiActionType>('improve');
  const [targetLanguage, setTargetLanguage] = useState<TranslationTargetLanguage>('Vietnamese');
  const [customPrompt, setCustomPrompt] = useState('');
  const [model, setModel] = useState(defaultModel || 'gemini-3.7-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const actionList: { id: AiActionType; icon: any; label: string; desc: string }[] = [
    { id: 'improve', icon: Wand2, label: t.actions.improve, desc: t.actionDescriptions.improve },
    { id: 'grammar', icon: CheckCircle, label: t.actions.grammar, desc: t.actionDescriptions.grammar },
    { id: 'summarize', icon: FileText, label: t.actions.summarize, desc: t.actionDescriptions.summarize },
    { id: 'expand', icon: Maximize2, label: t.actions.expand, desc: t.actionDescriptions.expand },
    { id: 'translate', icon: Languages, label: t.actions.translate, desc: t.actionDescriptions.translate },
    { id: 'outline', icon: ListOrdered, label: t.actions.outline, desc: t.actionDescriptions.outline },
    { id: 'continue', icon: FastForward, label: t.actions.continue, desc: t.actionDescriptions.continue },
    { id: 'simplify', icon: HelpCircle, label: t.actions.simplify, desc: t.actionDescriptions.simplify },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const output = await executeAiAction({
        action: selectedAction,
        text: targetText,
        targetLanguage,
        customPrompt: customPrompt.trim() ? customPrompt : undefined,
        model,
        apiKey,
      });
      setResultText(output);
    } catch (err: any) {
      setError(err.message || 'Failed to generate response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold font-mono">
                  {model}
                </span>
              </div>
              <p className="text-xs text-slate-500">{t.badge}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Key Missing Warning Banner */}
        {!apiKey && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <Key className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chưa cấu hình Gemini API Key. Bạn có thể thêm khóa để sử dụng không giới hạn.</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors cursor-pointer text-xs shrink-0"
            >
              Cấu hình ngay
            </button>
          </div>
        )}

        {/* Main 2-Column Workspace */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left Column: Actions & Configuration (5 cols) */}
          <div className="md:col-span-5 p-5 space-y-4 overflow-y-auto bg-slate-50/50">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                1. Chọn hành động AI
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {actionList.map((act) => {
                  const Icon = act.icon;
                  const isSelected = selectedAction === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setSelectedAction(act.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-white text-indigo-900 shadow-xs ring-2 ring-indigo-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span>{act.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{act.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If translation */}
            {selectedAction === 'translate' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Ngôn ngữ dịch đích
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as any)}
                  className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 shadow-xs"
                >
                  <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
                  <option value="English">English</option>
                  <option value="French">Français (French)</option>
                  <option value="Japanese">日本語 (Japanese)</option>
                  <option value="Korean">한국어 (Korean)</option>
                  <option value="Chinese">中文 (Chinese)</option>
                  <option value="Spanish">Español (Spanish)</option>
                  <option value="German">Deutsch (German)</option>
                </select>
              </div>
            )}

            {/* Model Selection & Custom Model Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Mô hình AI (Tự điền model)
                </label>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Cài đặt
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value.trim())}
                  placeholder="gemini-3.7-flash, gemini-3.6-flash..."
                  className="w-full text-xs font-mono rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {AVAILABLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-all cursor-pointer ${
                      model === m.id
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m.id.replace('gemini-', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Instruction Prompt */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Yêu cầu bổ sung (Tùy chọn)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ví dụ: Dùng văn phong trang trọng, thêm emoji, liệt kê 5 gạch đầu dòng..."
                rows={2}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-xs resize-none"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || !targetText.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý với Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo kết quả ngay</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Source & AI Result (7 cols) */}
          <div className="md:col-span-7 p-5 flex flex-col min-h-0 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {resultText ? 'Kết quả phản hồi từ AI' : 'Văn bản đầu vào'}
              </span>
              {resultText && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3.5 mb-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {(error.includes('Quota') ||
                  error.includes('Credits') ||
                  error.includes('429') ||
                  error.includes('API Key') ||
                  error.includes('Cài đặt')) && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      Mở Cài đặt để thêm API Key
                    </button>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-rose-700 hover:text-rose-900 underline font-medium"
                    >
                      Lấy khóa miễn phí từ Google AI Studio
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Main Display Box */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap selection:bg-indigo-100">
              {resultText ? (
                resultText
              ) : (
                <div className="text-slate-400 font-sans">
                  <div className="font-semibold text-slate-600 mb-1">Đoạn văn bản sẽ xử lý:</div>
                  <div className="italic line-clamp-6 bg-white p-3 rounded-lg border border-slate-200 text-slate-600 font-mono text-[11px]">
                    {targetText || '(Trống - hãy viết nội dung vào editor)'}
                  </div>
                  <div className="mt-3 text-[11px]">
                    Nhấn nút <strong className="text-indigo-600">"Tạo kết quả ngay"</strong> để Gemini AI bắt đầu tối ưu và viết văn bản.
                  </div>
                </div>
              )}
            </div>

            {/* Apply & Insert Controls */}
            {resultText && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onApplyReplacement(resultText, 'replace');
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Thay thế văn bản
                  </button>
                  <button
                    onClick={() => {
                      onApplyReplacement(resultText, 'insertBelow');
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Chèn xuống dưới
                  </button>
                </div>

                {canUndo && (
                  <button
                    onClick={onUndoLastReplacement}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Hoàn tác lần thay thế trước</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
