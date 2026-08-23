import React, { useState, useEffect } from 'react';
import {
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Palette,
  HardDrive,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  X,
  Sun,
  Sparkles,
  ShieldCheck,
  Globe,
  Server,
} from 'lucide-react';
import { AiProvider, AppSettings, Language } from '../types';
import { translations } from '../utils/i18n';
import {
  testGeminiApiKey,
  testOpenAiApiKey,
  testServerOpenAiConfig,
  checkServerKeyStatus,
  checkOpenAiServerStatus,
  AVAILABLE_MODELS,
} from '../services/aiService';
import {
  getSecret,
  setSecret,
  clearSecret,
  clearAllSecrets,
  hasSecret,
  isCryptoAvailable,
} from '../services/secureKeyStore';
import { getStorageEstimate, exportAllDataJson, importDataJson, db } from '../db';
import { downloadBlob } from '../services/exportService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => void;
  onDataReset?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onDataReset,
}) => {
  const [aiProvider, setAiProvider] = useState<AiProvider>(settings.aiProvider || 'gemini');
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel || 'gemini-3.7-flash');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(
    settings.openaiBaseUrl || 'https://api.openai.com/v1'
  );
  const [openaiModel, setOpenaiModel] = useState(settings.openaiModel || 'gpt-4o-mini');
  const [rememberApiKeys, setRememberApiKeys] = useState(settings.rememberApiKeys ?? false);

  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  const [openaiKeySaved, setOpenaiKeySaved] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ available: boolean; hasServerKey: boolean } | null>(null);
  const [openaiServer, setOpenaiServer] = useState<{
    available: boolean;
    configured: boolean;
    baseUrl: string | null;
    defaultModel: string | null;
  } | null>(null);

  const [language, setLanguage] = useState<Language>(settings.language || 'vi');
  const [fontSize, setFontSize] = useState(settings.fontSize || 15);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily || 'sans');
  const [lineNumbers, setLineNumbers] = useState(settings.lineNumbers ?? true);
  const [wordWrap, setWordWrap] = useState(settings.wordWrap ?? true);
  const [syncScroll, setSyncScroll] = useState(settings.syncScroll ?? true);

  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [storageStats, setStorageStats] = useState({ usageKb: 0, docCount: 0, folderCount: 0 });
  const [activeTab, setActiveTab] = useState<'api' | 'editor' | 'storage'>('api');

  const t = translations[language].settings;

  useEffect(() => {
    if (isOpen) {
      setAiProvider(settings.aiProvider || 'gemini');
      setSelectedModel(settings.selectedModel || 'gemini-3.7-flash');
      setOpenaiBaseUrl(settings.openaiBaseUrl || 'https://api.openai.com/v1');
      setOpenaiModel(settings.openaiModel || 'gpt-4o-mini');
      setRememberApiKeys(settings.rememberApiKeys ?? false);
      setLanguage(settings.language || 'vi');
      setFontSize(settings.fontSize || 15);
      setFontFamily(settings.fontFamily || 'sans');
      setLineNumbers(settings.lineNumbers ?? true);
      setWordWrap(settings.wordWrap ?? true);
      setSyncScroll(settings.syncScroll ?? true);
      setTestResult(null);
      setGeminiKeyInput('');
      setOpenaiKeyInput('');

      hasSecret('gemini').then(setGeminiKeySaved);
      hasSecret('openai').then(setOpenaiKeySaved);
      checkServerKeyStatus(true).then(setServerStatus);
      checkOpenAiServerStatus(true).then(setOpenaiServer);
      getStorageEstimate().then(setStorageStats);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      if (aiProvider === 'openai') {
        if (openaiKeyInput.trim() || openaiKeySaved) {
          // Personal key: test it directly against the configured endpoint
          const key = openaiKeyInput.trim() || (await getSecret('openai'));
          const res = await testOpenAiApiKey(key, openaiBaseUrl, openaiModel);
          setTestResult(res);
        } else if (openaiServer?.available && openaiServer.configured) {
          // No personal key: test the server's shared configuration
          const res = await testServerOpenAiConfig();
          setTestResult(res);
        } else {
          setTestResult({ success: false, message: 'Chưa nhập API Key cá nhân và server cũng chưa cấu hình OpenAI.' });
        }
      } else {
        const key = geminiKeyInput.trim() || (await getSecret('gemini'));
        const res = await testGeminiApiKey(key, selectedModel);
        setTestResult(res);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Kiểm tra kết nối thất bại' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSave = async () => {
    // Keys go into the encrypted/session store, never into AppSettings.
    if (geminiKeyInput.trim()) {
      await setSecret('gemini', geminiKeyInput, rememberApiKeys);
    }
    if (openaiKeyInput.trim()) {
      await setSecret('openai', openaiKeyInput, rememberApiKeys);
    }

    onSaveSettings({
      aiProvider,
      selectedModel,
      openaiBaseUrl: openaiBaseUrl.trim(),
      openaiModel: openaiModel.trim(),
      rememberApiKeys,
      language,
      theme: 'light',
      fontSize,
      fontFamily,
      lineNumbers,
      wordWrap,
      syncScroll,
    });
    onClose();
  };

  const handleRemoveKey = async (provider: AiProvider) => {
    await clearSecret(provider);
    if (provider === 'gemini') {
      setGeminiKeyInput('');
      setGeminiKeySaved(false);
    } else {
      setOpenaiKeyInput('');
      setOpenaiKeySaved(false);
    }
    setTestResult(null);
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `mdedit_backup_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const res = await importDataJson(text);
        alert(`Đã khôi phục thành công ${res.docsImported} tài liệu và ${res.foldersImported} thư mục!`);
        getStorageEstimate().then(setStorageStats);
        if (onDataReset) onDataReset();
      } catch (err: any) {
        alert('Không thể đọc tệp sao lưu JSON: ' + err.message);
      }
    };
    input.click();
  };

  const handleClearAllData = async () => {
    const confirmation = prompt(t.clearDataConfirm);
    if (confirmation === 'DELETE') {
      await db.documents.clear();
      await db.folders.clear();
      await clearAllSecrets();
      alert('Tất cả tài liệu cục bộ và API key đã được xóa.');
      if (onDataReset) onDataReset();
      onClose();
    }
  };

  const keyInputClass =
    'w-full text-xs font-mono rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-10 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
              <p className="text-xs text-slate-500">Tùy biến không gian làm việc và AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'api'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{t.tabAi}</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{t.tabEditor}</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'storage'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>{t.tabStorage}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {/* TAB 1: AI PROVIDERS & API KEYS */}
          {activeTab === 'api' && (
            <div className="space-y-5">
              {/* Provider selection */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Nhà cung cấp AI</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiProvider('gemini')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      aiProvider === 'gemini'
                        ? 'border-indigo-500 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Gemini (mặc định)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Ưu tiên key server an toàn; fallback key cá nhân (BYOK).
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiProvider('openai')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      aiProvider === 'openai'
                        ? 'border-indigo-500 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" /> OpenAI-compatible
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      OpenAI, OpenRouter, Groq, DeepSeek, Ollama... (base URL tùy chỉnh).
                    </div>
                  </button>
                </div>
              </div>

              {/* Server status (Gemini hybrid) */}
              {aiProvider === 'gemini' && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    serverStatus?.available && serverStatus.hasServerKey
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : serverStatus?.available
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <Server className="w-4 h-4 shrink-0" />
                  <span>
                    {serverStatus?.available && serverStatus.hasServerKey
                      ? 'Đang chạy cùng server — key dùng chung nằm an toàn phía server, không cần key cá nhân.'
                      : serverStatus?.available
                      ? 'Có server nhưng chưa cấu hình GEMINI_API_KEY phía server — cần key cá nhân bên dưới.'
                      : 'Không có server — AI sẽ gọi thẳng Google bằng API key cá nhân (BYOK) bên dưới.'}
                  </span>
                </div>
              )}

              {/* Gemini configuration */}
              {aiProvider === 'gemini' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-indigo-600" />
                        <span>API Key cá nhân (BYOK — tùy chọn)</span>
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 underline font-medium flex items-center gap-1"
                      >
                        <span>{t.getKeyLink}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showGeminiKey ? 'text' : 'password'}
                          value={geminiKeyInput}
                          onChange={(e) => setGeminiKeyInput(e.target.value)}
                          placeholder={
                            geminiKeySaved ? '•••••••• (đã lưu — nhập để thay đổi)' : t.apiKeyPlaceholder
                          }
                          autoComplete="off"
                          className={keyInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {geminiKeySaved && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKey('gemini')}
                          className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition-colors cursor-pointer"
                          title="Xóa key cá nhân đã lưu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={handleTestKey}
                        disabled={isTestingKey || (!geminiKeyInput.trim() && !geminiKeySaved)}
                        className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isTestingKey ? (
                          <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isTestingKey ? t.testingKey : t.testKeyBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* Model selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 block">{t.modelSelection}</label>
                      <span className="text-[11px] text-indigo-600 font-mono font-bold">{selectedModel}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                        <span>{t.customModel}</span>
                        <span className="text-slate-400 text-[10px]">Đang dùng: {selectedModel}</span>
                      </div>
                      <input
                        type="text"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value.trim())}
                        placeholder={t.customModelPlaceholder}
                        className="w-full text-xs font-mono rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-slate-500 font-medium block">{t.presetModels}</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {AVAILABLE_MODELS.map((m) => {
                          const isSelected = selectedModel === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedModel(m.id)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-xs ring-1 ring-indigo-300'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-slate-900">{m.name}</span>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">{m.id}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">{t.modelHint}</p>
                  </div>
                </>
              )}

              {/* OpenAI-compatible configuration */}
              {aiProvider === 'openai' && (
                <>
                  {/* Server status (hybrid) */}
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2 ${
                      openaiServer?.available && openaiServer.configured
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : openaiServer?.available
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Server className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {openaiServer?.available && openaiServer.configured
                        ? `Server đã cấu hình OpenAI-compatible — endpoint ${openaiServer.baseUrl}${
                            openaiServer.defaultModel ? `, model mặc định ${openaiServer.defaultModel}` : ''
                          }. Không cần key cá nhân (key dùng chung nằm an toàn phía server).`
                        : openaiServer?.available
                        ? 'Có server nhưng chưa cấu hình OPENAI_BASE_URL + OPENAI_API_KEY phía server — cần key cá nhân bên dưới.'
                        : 'Không có server — AI sẽ gọi thẳng endpoint bằng API key cá nhân (BYOK) bên dưới.'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span>Base URL (endpoint tương thích OpenAI)</span>
                    </label>
                    <input
                      type="text"
                      value={openaiBaseUrl}
                      onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full text-xs font-mono rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: 'OpenAI', url: 'https://api.openai.com/v1' },
                        { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
                        { label: 'Groq', url: 'https://api.groq.com/openai/v1' },
                        { label: 'Ollama (local)', url: 'http://localhost:11434/v1' },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setOpenaiBaseUrl(p.url)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            openaiBaseUrl === p.url
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-emerald-600" />
                      <span>API Key cá nhân (tùy chọn khi server đã cấu hình)</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showOpenaiKey ? 'text' : 'password'}
                          value={openaiKeyInput}
                          onChange={(e) => setOpenaiKeyInput(e.target.value)}
                          placeholder={
                            openaiKeySaved ? '•••••••• (đã lưu — nhập để thay đổi)' : 'sk-...'
                          }
                          autoComplete="off"
                          className={keyInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {openaiKeySaved && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKey('openai')}
                          className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition-colors cursor-pointer"
                          title="Xóa key đã lưu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={handleTestKey}
                        disabled={
                          isTestingKey ||
                          (!openaiKeyInput.trim() && !openaiKeySaved && !(openaiServer?.available && openaiServer.configured))
                        }
                        className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isTestingKey ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isTestingKey ? t.testingKey : t.testKeyBtn}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Key chỉ được gửi tới đúng endpoint bạn cấu hình (qua HTTPS, trong header). Endpoint cần cho
                      phép gọi trực tiếp từ trình duyệt (CORS) — các nhà cung cấp lớn đều hỗ trợ.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold text-slate-800">Tên model</label>
                    <input
                      type="text"
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value.trim())}
                      placeholder="gpt-4o-mini, llama-3.1-70b-versatile, deepseek-chat..."
                      className="w-full text-xs font-mono rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                    />
                  </div>
                </>
              )}

              {/* Key test feedback */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    testResult.success
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Key storage security */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Bảo vệ API key</span>
                </div>
                <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer">
                  <span className="font-medium text-slate-800">
                    Ghi nhớ key trên máy này (mã hóa AES-GCM)
                    {!isCryptoAvailable() && (
                      <span className="block text-[10px] text-amber-600 font-normal mt-0.5">
                        Trình duyệt không hỗ trợ Web Crypto (ngữ cảnh không an toàn) — chỉ lưu được trong phiên.
                      </span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={rememberApiKeys}
                    disabled={!isCryptoAvailable()}
                    onChange={(e) => setRememberApiKeys(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                  />
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {rememberApiKeys
                    ? 'Key được mã hoá bằng khoá không-thể-xuất (non-extractable) lưu trong IndexedDB — kể cả khi đọc trực tiếp file cơ sở dữ liệu cũng chỉ thấy mật mã.'
                    : 'Mặc định: key chỉ nằm trong bộ nhớ của phiên làm việc, đóng tab là biến mất — an toàn nhất khi dùng máy chung.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">{t.language}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none font-medium text-slate-900 focus:border-indigo-500"
                  >
                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                    <option value="en">English (English)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Giao diện (Chế độ duy nhất)</label>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Chế độ sáng (Light Mode duy nhất)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">{t.fontFamily}</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none font-medium text-slate-900 focus:border-indigo-500"
                  >
                    <option value="sans">{t.fontSans}</option>
                    <option value="serif">{t.fontSerif}</option>
                    <option value="mono">{t.fontMono}</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    {t.fontSize}: <span className="font-mono text-indigo-600 font-bold">{fontSize}px</span>
                  </label>
                  <input
                    type="range"
                    min={13}
                    max={22}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 mt-2 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="font-medium text-slate-800">{t.lineNumbers}</span>
                  <input
                    type="checkbox"
                    checked={lineNumbers}
                    onChange={(e) => setLineNumbers(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="font-medium text-slate-800">{t.wordWrap}</span>
                  <input
                    type="checkbox"
                    checked={wordWrap}
                    onChange={(e) => setWordWrap(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="font-medium text-slate-800">{t.syncScroll}</span>
                  <input
                    type="checkbox"
                    checked={syncScroll}
                    onChange={(e) => setSyncScroll(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL STORAGE & BACKUP */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>{t.storageStatus}</span>
                  <span className="text-emerald-700 font-semibold">100% Cục bộ & Bảo mật</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <div className="font-mono text-sm font-bold text-indigo-600">{storageStats.docCount}</div>
                    <div className="text-[10px] text-slate-500">Tài liệu</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <div className="font-mono text-sm font-bold text-indigo-600">{storageStats.folderCount}</div>
                    <div className="text-[10px] text-slate-500">Thư mục</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <div className="font-mono text-sm font-bold text-indigo-600">{storageStats.usageKb} KB</div>
                    <div className="text-[10px] text-slate-500">Dung lượng</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-800">{t.backupSection}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>{t.exportAllJson}</span>
                  </button>

                  <button
                    onClick={handleImportBackup}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{t.importJson}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bản sao lưu chứa tài liệu & cài đặt, nhưng <strong>không bao giờ</strong> chứa API key.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="font-semibold text-rose-600 mb-2">{t.dangerZone}</div>
                <button
                  onClick={handleClearAllData}
                  className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>{t.clearAllDataBtn}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/80">
          <span className="text-[11px] text-slate-400">MDEdit • Phiên bản sáng độc quyền</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {t.saveChanges}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
