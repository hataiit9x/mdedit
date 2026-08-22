import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu,
  FilePlus,
  Save,
  Sparkles,
  Download,
  ListTree,
  Sliders,
  Keyboard,
  Maximize2,
  Minimize2,
  Columns,
  SquareCode,
  Eye,
  Search,
  FolderOpen,
  CheckCircle2,
  Key,
  ShieldCheck,
  Languages,
  Sun,
  HardDrive,
  FileCheck,
  Square,
  ChevronDown,
  Info,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';

import {
  DocumentItem,
  FolderItem,
  AppSettings,
  ViewMode,
  Language,
  AiActionType,
  TranslationTargetLanguage,
} from './types';
import {
  db,
  getSettings,
  saveSettings,
  getAllDocuments,
  getAllFolders,
  createDocument,
  updateDocument,
  deleteDocument,
  createFolder,
  updateFolder,
  deleteFolder,
  initSampleData,
} from './db';
import { extractHeadings, calculateStats } from './utils/markdownUtils';
import { translations } from './utils/i18n';
import { openLocalFile, saveToLocalFile } from './services/fileSystemService';
import { executeAiActionStream } from './services/aiService';
import {
  exportAsMarkdown,
  exportAsPlainText,
  exportAsHtml,
  exportAsPdf,
  exportAsPng,
  exportTablesToSpreadsheet,
  exportAsDocx,
} from './services/exportService';

// Subcomponents
import { Sidebar } from './components/Sidebar';
import { MarkdownEditor, MarkdownEditorHandle } from './components/MarkdownEditor';
import { MarkdownPreview } from './components/MarkdownPreview';
import { EditorToolbar } from './components/EditorToolbar';
import { TableOfContents } from './components/TableOfContents';
import { AiAssistantModal } from './components/AiAssistantModal';
import { ExportModal } from './components/ExportModal';
import { ExportMenuDropdown } from './components/ExportMenuDropdown';
import { SettingsModal } from './components/SettingsModal';
import { FindReplaceModal } from './components/FindReplaceModal';
import { TableGeneratorModal } from './components/TableGeneratorModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { OnboardingModal } from './components/OnboardingModal';

export default function App() {
  // Database state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DocumentItem | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    geminiApiKey: '',
    selectedModel: 'gemini-3.7-flash',
    theme: 'light',
    language: 'vi',
    fontSize: 15,
    fontFamily: 'sans',
    lineNumbers: true,
    wordWrap: true,
    syncScroll: true,
    autoSaveIntervalMs: 2000,
    hasSeenOnboarding: false,
    defaultPaneMode: 'split',
  });

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type?: 'info' | 'success' | 'error';
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Selection & Cursor Tracking
  const [selectedText, setSelectedText] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // History stack for Undo/Redo
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // In-Editor AI Streaming state
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [aiStreamingActionName, setAiStreamingActionName] = useState<string>('');
  const [aiStreamingError, setAiStreamingError] = useState<string | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  // Refs
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrollingSync = useRef(false);

  const t = translations[settings.language || 'vi'];

  const showToast = (
    text: string,
    type: 'info' | 'success' | 'error' = 'success',
    action?: { label: string; onClick: () => void },
    duration = 4000
  ) => {
    setToastMessage({
      text,
      type,
      actionLabel: action?.label,
      onAction: action?.onClick,
    });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, duration);
  };

  // Direct Export actions (Gemini AI style)
  const handleDirectExportPdf = () => {
    showToast('Đang mở hộp thoại in / xuất PDF...', 'info');
    exportAsPdf();
  };

  const handleDirectExportWord = async () => {
    if (!currentDoc) return;
    showToast('Đang tạo tệp Microsoft Word (.docx)...', 'info');
    try {
      const ok = await exportAsDocx(currentDoc.title, currentDoc.content);
      if (ok) {
        showToast('Đã tải xuống tệp Word (.docx) thành công!', 'success');
      } else {
        showToast('Không thể tạo tệp Word.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xuất Word.', 'error');
    }
  };

  const handleDirectExportMarkdown = () => {
    if (!currentDoc) return;
    exportAsMarkdown(currentDoc.title, currentDoc.content);
    showToast('Đã tải xuống tệp Markdown (.md) thành công!', 'success');
  };

  const handleDirectExportHtml = () => {
    if (!currentDoc || !previewRef.current) {
      showToast('Chưa có nội dung xem trước để xuất HTML.', 'error');
      return;
    }
    exportAsHtml(currentDoc.title, previewRef.current);
    showToast('Đã tải xuống tệp HTML độc lập (.html) thành công!', 'success');
  };

  const handleDirectExportPng = async () => {
    if (!currentDoc || !previewRef.current) {
      showToast('Chưa có nội dung xem trước để chụp ảnh.', 'error');
      return;
    }
    showToast('Đang xử lý ảnh PNG xem trước...', 'info');
    const ok = await exportAsPng(currentDoc.title, previewRef.current, false);
    if (ok) {
      showToast('Đã tải ảnh PNG xem trước thành công!', 'success');
    } else {
      showToast('Không thể chụp ảnh bản xem trước.', 'error');
    }
  };

  const handleDirectExportExcel = () => {
    if (!currentDoc) return;
    const ok = exportTablesToSpreadsheet(currentDoc.title, currentDoc.content, 'xlsx');
    if (ok) {
      showToast('Đã xuất bảng ra tệp Excel (.xlsx) thành công!', 'success');
    } else {
      showToast('Không tìm thấy bảng Markdown trong tài liệu này.', 'error');
    }
  };

  const handleDirectExportCsv = () => {
    if (!currentDoc) return;
    const ok = exportTablesToSpreadsheet(currentDoc.title, currentDoc.content, 'csv');
    if (ok) {
      showToast('Đã xuất bảng ra tệp CSV (.csv) thành công!', 'success');
    } else {
      showToast('Không tìm thấy bảng Markdown trong tài liệu này.', 'error');
    }
  };

  const handleDirectExportPlainText = () => {
    if (!currentDoc) return;
    exportAsPlainText(currentDoc.title, currentDoc.content);
    showToast('Đã tải xuống tệp văn bản thuần (.txt) thành công!', 'success');
  };

  const handleDirectCopyHtml = () => {
    if (!previewRef.current) {
      showToast('Chưa có nội dung xem trước để sao chép.', 'error');
      return;
    }
    navigator.clipboard.writeText(previewRef.current.innerHTML);
    showToast('Đã sao chép mã HTML vào clipboard!', 'success');
  };

  // Initialize DB and settings
  const refreshData = useCallback(async () => {
    await initSampleData();
    const storedSettings = await getSettings();
    setSettings({ ...storedSettings, theme: 'light' });

    const docs = await getAllDocuments();
    const flds = await getAllFolders();
    setDocuments(docs);
    setFolders(flds);

    if (docs.length > 0) {
      const active = docs.find((d) => !d.isTrash) || docs[0];
      setCurrentDoc(active);
      setHistoryStack([active.content]);
      setHistoryIndex(0);
    }

    if (!storedSettings.hasSeenOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Document selection
  const handleSelectDoc = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      setCurrentDoc(doc);
      setHistoryStack([doc.content]);
      setHistoryIndex(0);
    }
  };

  // Content change & auto-save to IndexedDB (debounced)
  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!currentDoc) return;

      const updated = {
        ...currentDoc,
        content: newContent,
        updatedAt: Date.now(),
      };
      setCurrentDoc(updated);

      // Auto update history if not in undo/redo
      if (!isUndoRedoAction.current) {
        setHistoryStack((prev) => {
          const next = prev.slice(0, historyIndex + 1);
          return [...next, newContent];
        });
        setHistoryIndex((prev) => prev + 1);
      }
      isUndoRedoAction.current = false;

      // Update in documents list
      setDocuments((prev) =>
        prev.map((d) => (d.id === currentDoc.id ? updated : d))
      );

      // Debounced persist
      updateDocument(currentDoc.id, { content: newContent }).then(() => {
        setIsSavedRecently(true);
        setTimeout(() => setIsSavedRecently(false), 2000);
      });
    },
    [currentDoc, historyIndex]
  );

  // Title change
  const handleTitleChange = async (newTitle: string) => {
    if (!currentDoc) return;
    const updated = { ...currentDoc, title: newTitle, updatedAt: Date.now() };
    setCurrentDoc(updated);
    setDocuments((prev) =>
      prev.map((d) => (d.id === currentDoc.id ? updated : d))
    );
    await updateDocument(currentDoc.id, { title: newTitle });
  };

  // Create new document
  const handleCreateDoc = async (folderId?: string | null) => {
    const newDoc = await createDocument({
      title: 'Tài liệu không tên',
      content: `# Tài liệu mới\n\nBắt đầu soạn thảo nội dung với định dạng **Markdown** hoặc nhấn **Gemini AI** để được hỗ trợ viết...\n`,
      folderId: folderId || null,
    });
    const all = await getAllDocuments();
    setDocuments(all);
    setCurrentDoc(newDoc);
    setHistoryStack([newDoc.content]);
    setHistoryIndex(0);
  };

  // Folders management
  const handleCreateFolder = async (name: string) => {
    await createFolder(name);
    setFolders(await getAllFolders());
  };

  const handleRenameFolder = async (id: string, name: string) => {
    await updateFolder(id, name);
    setFolders(await getAllFolders());
  };

  const handleDeleteFolder = async (id: string) => {
    await deleteFolder(id);
    setFolders(await getAllFolders());
    setDocuments(await getAllDocuments());
  };

  // Document actions
  const handlePinDoc = async (id: string, isPinned: boolean) => {
    await updateDocument(id, { isPinned });
    setDocuments(await getAllDocuments());
    if (currentDoc?.id === id) {
      setCurrentDoc((prev) => (prev ? { ...prev, isPinned } : null));
    }
  };

  const handleDuplicateDoc = async (id: string) => {
    const original = documents.find((d) => d.id === id);
    if (original) {
      const copy = await createDocument({
        title: `${original.title} (Bản sao)`,
        content: original.content,
        folderId: original.folderId,
      });
      setDocuments(await getAllDocuments());
      setCurrentDoc(copy);
      setHistoryStack([copy.content]);
      setHistoryIndex(0);
    }
  };

  const handleMoveDocToFolder = async (docId: string, folderId: string | null) => {
    await updateDocument(docId, { folderId });
    setDocuments(await getAllDocuments());
    if (currentDoc?.id === docId) {
      setCurrentDoc((prev) => (prev ? { ...prev, folderId } : null));
    }
  };

  const handleMoveDocToTrash = async (id: string) => {
    await updateDocument(id, { isTrash: true });
    const all = await getAllDocuments();
    setDocuments(all);
    if (currentDoc?.id === id) {
      const active = all.find((d) => !d.isTrash);
      setCurrentDoc(active || null);
    }
  };

  const handleRestoreDoc = async (id: string) => {
    await updateDocument(id, { isTrash: false });
    const all = await getAllDocuments();
    setDocuments(all);
  };

  const handleDeleteDocPermanent = async (id: string) => {
    await deleteDocument(id);
    const all = await getAllDocuments();
    setDocuments(all);
    if (currentDoc?.id === id) {
      const active = all.find((d) => !d.isTrash);
      setCurrentDoc(active || null);
    }
  };

  const handleEmptyTrash = async () => {
    const trash = documents.filter((d) => d.isTrash);
    for (const d of trash) {
      await deleteDocument(d.id);
    }
    setDocuments(await getAllDocuments());
  };

  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await saveSettings({ ...newSettings, theme: 'light' });
    setSettings(updated);
  };

  // Markdown Formatting Toolbar Handler
  const handleFormat = (action: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    switch (action) {
      case 'bold':
        editor.wrapSelection('**', '**', 'chữ in đậm');
        break;
      case 'italic':
        editor.wrapSelection('*', '*', 'chữ in nghiêng');
        break;
      case 'strike':
        editor.wrapSelection('~~', '~~', 'gạch ngang chữ');
        break;
      case 'code':
        editor.wrapSelection('`', '`', 'mã_inline');
        break;
      case 'h1':
        editor.wrapSelection('# ', '\n', 'Tiêu đề 1');
        break;
      case 'h2':
        editor.wrapSelection('## ', '\n', 'Tiêu đề 2');
        break;
      case 'h3':
        editor.wrapSelection('### ', '\n', 'Tiêu đề 3');
        break;
      case 'quote':
        editor.wrapSelection('> ', '\n', 'Trích dẫn ghi chú');
        break;
      case 'codeblock':
        editor.wrapSelection('```javascript\n', '\n```\n', '// Nhập mã code tại đây\nconsole.log("Hello World");');
        break;
      case 'ul':
        editor.wrapSelection('- ', '\n', 'Mục danh sách');
        break;
      case 'ol':
        editor.wrapSelection('1. ', '\n', 'Mục danh sách thứ tự');
        break;
      case 'task':
        editor.wrapSelection('- [ ] ', '\n', 'Công việc cần làm');
        break;
      case 'link':
        editor.wrapSelection('[', '](https://example.com)', 'Văn bản liên kết');
        break;
      case 'image':
        editor.wrapSelection('![', '](https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800)', 'Mô tả hình ảnh');
        break;
      case 'hr':
        editor.insertText('\n---\n\n');
        break;
      case 'math':
        editor.wrapSelection('$$\n', '\n$$\n', 'f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx');
        break;
      case 'mermaid':
        editor.insertText(
          '\n```mermaid\ngraph TD\n  A[Bắt đầu] --> B{Xử lý}\n  B -->|Thành công| C[Hoàn tất]\n  B -->|Lỗi| D[Kiểm tra lại]\n```\n'
        );
        break;
      default:
        break;
    }
  };

  // Direct In-Editor AI Streaming Generation
  const handleSelectAiAction = async (
    action: AiActionType,
    targetLanguage?: TranslationTargetLanguage
  ) => {
    if (!currentDoc) return;
    const editor = editorRef.current;
    if (!editor) return;

    const currentSelection = editor.getSelectedText();
    const hasSelection = Boolean(currentSelection && currentSelection.trim().length > 0);
    const range = editor.getSelectionRange();
    const targetSourceText = hasSelection ? currentSelection : currentDoc.content;

    if (!targetSourceText.trim()) {
      setAiStreamingError('Tài liệu trống. Hãy viết thêm nội dung để AI xử lý.');
      setTimeout(() => setAiStreamingError(null), 3500);
      return;
    }

    const actionLabels: Record<AiActionType, string> = {
      improve: 'Cải thiện câu chữ',
      grammar: 'Sửa chính tả & Ngữ pháp',
      summarize: 'Tóm tắt nội dung',
      expand: 'Mở rộng chi tiết',
      translate: `Dịch sang ${targetLanguage || 'Vietnamese'}`,
      outline: 'Tạo dàn ý',
      continue: 'Viết tiếp',
      simplify: 'Giải thích đơn giản',
      custom: 'Yêu cầu tùy chỉnh',
    };

    setAiStreamingActionName(actionLabels[action] || action);
    setIsAiStreaming(true);
    setAiStreamingError(null);

    const abortController = new AbortController();
    aiAbortControllerRef.current = abortController;

    const originalContent = currentDoc.content;

    try {
      if (hasSelection) {
        // Selection mode: snapshot prefix & suffix cleanly
        const startPos = range.start;
        const oldLen = currentSelection.length;
        const prefix = originalContent.substring(0, startPos);
        const suffix = originalContent.substring(startPos + oldLen);

        await executeAiActionStream({
          action,
          text: targetSourceText,
          targetLanguage,
          model: settings.selectedModel || 'gemini-3.7-flash',
          apiKey: settings.geminiApiKey,
          signal: abortController.signal,
          onChunk: (_chunk, accumulated) => {
            const newDocContent = prefix + accumulated + suffix;
            handleContentChange(newDocContent);
          },
        });
      } else if (action === 'continue' || action === 'expand') {
        // Append mode: append stream directly to bottom of current doc
        const baseContent = originalContent.trimEnd();
        const prefix = baseContent ? baseContent + '\n\n' : '';

        await executeAiActionStream({
          action,
          text: targetSourceText,
          targetLanguage,
          model: settings.selectedModel || 'gemini-3.7-flash',
          apiKey: settings.geminiApiKey,
          signal: abortController.signal,
          onChunk: (_chunk, accumulated) => {
            const newDocContent = prefix + accumulated;
            handleContentChange(newDocContent);
          },
        });
      } else {
        // Full doc replacement mode
        await executeAiActionStream({
          action,
          text: targetSourceText,
          targetLanguage,
          model: settings.selectedModel || 'gemini-3.7-flash',
          apiKey: settings.geminiApiKey,
          signal: abortController.signal,
          onChunk: (_chunk, accumulated) => {
            handleContentChange(accumulated);
          },
        });
      }
      showToast(`Đã hoàn tất xử lý AI: ${actionLabels[action]}`, 'success');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast('Đã dừng xử lý AI.', 'info');
      } else {
        const errorText = err.message || 'Lỗi xử lý Gemini AI';
        setAiStreamingError(errorText);

        const isQuotaOrKey =
          errorText.includes('429') ||
          errorText.includes('Quota') ||
          errorText.includes('Credits') ||
          errorText.includes('Cài đặt') ||
          errorText.includes('API Key');

        if (isQuotaOrKey) {
          showToast(
            errorText,
            'error',
            {
              label: 'Mở Cài đặt',
              onClick: () => setIsSettingsOpen(true),
            },
            9000
          );
        } else {
          showToast(errorText, 'error', undefined, 5000);
        }
        setTimeout(() => setAiStreamingError(null), 6000);
      }
    } finally {
      setIsAiStreaming(false);
      aiAbortControllerRef.current = null;
    }
  };

  const handleStopAiStream = () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    setIsAiStreaming(false);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex - 1;
      const targetContent = historyStack[targetIndex];
      setHistoryIndex(targetIndex);
      if (currentDoc) {
        const updated = { ...currentDoc, content: targetContent };
        setCurrentDoc(updated);
        updateDocument(currentDoc.id, { content: targetContent });
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex + 1;
      const targetContent = historyStack[targetIndex];
      setHistoryIndex(targetIndex);
      if (currentDoc) {
        const updated = { ...currentDoc, content: targetContent };
        setCurrentDoc(updated);
        updateDocument(currentDoc.id, { content: targetContent });
      }
    }
  };

  // Synchronized Scrolling
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (!settings.syncScroll || isScrollingSync.current || !previewRef.current) return;
    isScrollingSync.current = true;
    const target = e.currentTarget;
    const percentage = target.scrollTop / (target.scrollHeight - target.clientHeight || 1);
    previewRef.current.scrollTop =
      percentage * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
    setTimeout(() => {
      isScrollingSync.current = false;
    }, 50);
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!settings.syncScroll || isScrollingSync.current || !editorRef.current) return;
    isScrollingSync.current = true;
    const textarea = editorRef.current.getTextarea();
    if (textarea) {
      const target = e.currentTarget;
      const percentage = target.scrollTop / (target.scrollHeight - target.clientHeight || 1);
      textarea.scrollTop = percentage * (textarea.scrollHeight - textarea.clientHeight);
    }
    setTimeout(() => {
      isScrollingSync.current = false;
    }, 50);
  };

  // Selection change handler
  const handleSelectionChange = (text: string, start: number) => {
    setSelectedText(text);
    if (currentDoc) {
      const upToCursor = currentDoc.content.substring(0, start);
      const lines = upToCursor.split('\n');
      setCursorPos({
        line: lines.length,
        col: lines[lines.length - 1].length + 1,
      });
    }
  };

  // Keyboard Shortcuts listener
  const handleGlobalKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      setIsAiModalOpen(true);
      return;
    }
    if (modifier && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setIsFindModalOpen(true);
      return;
    }
    if (modifier && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (currentDoc) {
        updateDocument(currentDoc.id, { content: currentDoc.content }).then(() => {
          setIsSavedRecently(true);
          setTimeout(() => setIsSavedRecently(false), 2000);
        });
      }
      return;
    }
    if (modifier && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      handleFormat('bold');
      return;
    }
    if (modifier && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      handleFormat('italic');
      return;
    }
    if (modifier && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      handleFormat('link');
      return;
    }
    if (modifier && (e.key === 'z' || e.key === 'Z')) {
      if (e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else {
        e.preventDefault();
        handleUndo();
      }
      return;
    }
    if (modifier && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      handleRedo();
      return;
    }
    if (e.key === 'Escape' && isAiStreaming) {
      e.preventDefault();
      handleStopAiStream();
      return;
    }
    if (e.key === 'F11') {
      e.preventDefault();
      setIsFocusMode((prev) => !prev);
      return;
    }
  };

  // Open / Save from local disk using File System Access API
  const handleOpenFileFromDisk = async () => {
    const file = await openLocalFile();
    if (file) {
      const newDoc = await createDocument({
        title: file.name.replace(/\.(md|markdown|txt)$/i, ''),
        content: file.content,
      });
      setDocuments(await getAllDocuments());
      setCurrentDoc(newDoc);
      setHistoryStack([newDoc.content]);
      setHistoryIndex(0);
    }
  };

  const handleSaveFileToDisk = async () => {
    if (!currentDoc) return;
    await saveToLocalFile(currentDoc.title, currentDoc.content);
  };

  // Derived statistics and Table of Contents
  const currentContent = currentDoc?.content || '';
  const stats = calculateStats(currentContent);
  const toc = extractHeadings(currentContent);

  // Jump to heading in preview and editor
  const handleJumpToHeading = (slug: string, headingText?: string) => {
    // 1. Scroll in preview pane
    const el = document.getElementById(slug);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // 2. Locate line in editor and scroll textarea
    if (editorRef.current && currentDoc && headingText) {
      const lines = currentDoc.content.split('\n');
      const cleanHeading = headingText.trim();
      const lineIdx = lines.findIndex((l) => l.includes(cleanHeading));
      if (lineIdx !== -1) {
        editorRef.current.scrollToLine(lineIdx + 1);
      }
    }
  };

  return (
    <div
      id="mdedit-root"
      className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 font-sans"
    >
      {/* 1. Collapsible Sidebar with Documents + Dedicated Tab of Contents */}
      {!isFocusMode && isSidebarOpen && (
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          documents={documents}
          folders={folders}
          currentDocId={currentDoc?.id || null}
          toc={toc}
          onSelectDoc={handleSelectDoc}
          onSelectHeading={handleJumpToHeading}
          onCreateDoc={handleCreateDoc}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onPinDoc={handlePinDoc}
          onDuplicateDoc={handleDuplicateDoc}
          onRenameDoc={handleTitleChange}
          onMoveDocToFolder={handleMoveDocToFolder}
          onMoveDocToTrash={handleMoveDocToTrash}
          onRestoreDoc={handleRestoreDoc}
          onDeleteDocPermanent={handleDeleteDocPermanent}
          onEmptyTrash={handleEmptyTrash}
          onOpenSettings={() => setIsSettingsOpen(true)}
          language={settings.language || 'vi'}
        />
      )}

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white text-slate-800 relative">
        {/* Top Navbar */}
        {!isFocusMode && (
          <header className="h-12 flex items-center justify-between px-3 sm:px-4 border-b border-slate-200 bg-white z-10 select-none text-slate-800 shadow-xs">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title={isSidebarOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Document Title Input */}
              {currentDoc ? (
                <div className="flex items-center gap-2 flex-1 max-w-md min-w-0">
                  <input
                    type="text"
                    value={currentDoc.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Tiêu đề tài liệu"
                    className="w-full text-sm font-bold bg-transparent outline-none text-slate-900 hover:bg-slate-50 focus:bg-slate-50 focus:border-slate-300 px-2 py-1 rounded-lg border border-transparent transition-colors truncate"
                  />
                  {isSavedRecently && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline-block">Đã lưu</span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400">Chưa chọn tài liệu nào</span>
              )}
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* File System (Disk Open / Save) */}
              <button
                onClick={handleOpenFileFromDisk}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title={t.nav.openFile}
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mở tệp</span>
              </button>

              <button
                onClick={handleSaveFileToDisk}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title={t.nav.saveFile}
              >
                <Save className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lưu vào máy</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    viewMode === 'edit'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={t.nav.editorOnly}
                >
                  <SquareCode className="w-3.5 h-3.5 sm:hidden inline-block" />
                  <span className="hidden sm:inline-block">Soạn thảo</span>
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={t.nav.splitView}
                >
                  <Columns className="w-3.5 h-3.5 sm:hidden inline-block" />
                  <span className="hidden sm:inline-block">Song song</span>
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={t.nav.previewOnly}
                >
                  <Eye className="w-3.5 h-3.5 sm:hidden inline-block" />
                  <span className="hidden sm:inline-block">Xem trước</span>
                </button>
              </div>

              {/* TOC Drawer Toggle */}
              <button
                onClick={() => setIsTocOpen(!isTocOpen)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isTocOpen
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={t.nav.tableOfContents}
              >
                <ListTree className="w-4 h-4 text-indigo-600" />
              </button>

              {/* Export Menu Item (Gemini AI style) */}
              <div className="relative inline-block">
                <button
                  id="gemini-export-menu-trigger"
                  aria-haspopup="menu"
                  aria-expanded={isExportMenuOpen}
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                    isExportMenuOpen
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                  title="Xuất tài liệu (PDF, Word, Markdown, HTML, PNG, Excel...)"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline-block">{t.nav.export}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                <ExportMenuDropdown
                  isOpen={isExportMenuOpen}
                  onClose={() => setIsExportMenuOpen(false)}
                  onExportPdf={handleDirectExportPdf}
                  onExportWord={handleDirectExportWord}
                  onExportMarkdown={handleDirectExportMarkdown}
                  onExportHtml={handleDirectExportHtml}
                  onExportPng={handleDirectExportPng}
                  onExportExcel={handleDirectExportExcel}
                  onExportCsv={handleDirectExportCsv}
                  onExportPlainText={handleDirectExportPlainText}
                  onCopyHtml={handleDirectCopyHtml}
                  onOpenAdvancedModal={() => setIsExportModalOpen(true)}
                  language={settings.language || 'vi'}
                  hasTables={Boolean(currentDoc?.content.includes('|'))}
                />
              </div>

              {/* AI Assistant Big Action */}
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold shadow-xs transition-all transform active:scale-95 cursor-pointer"
                title="Hộp thoại Gemini AI (Ctrl+Shift+A)"
              >
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-tight">
                  Gemini AI
                </span>
              </button>

              {/* Focus Mode Trigger */}
              <button
                onClick={() => setIsFocusMode(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Chế độ tập trung Zen (F11)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        {/* Focus Mode Exit Floating Pill */}
        {isFocusMode && (
          <div className="absolute top-4 right-4 z-40">
            <button
              onClick={() => setIsFocusMode(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-slate-800 text-xs font-semibold border border-slate-300 shadow-xl transition-all cursor-pointer hover:bg-slate-50"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Thoát tập trung</span>
            </button>
          </div>
        )}

        {/* Formatting Toolbar (Only in Edit or Split mode) */}
        {viewMode !== 'preview' && (
          <EditorToolbar
            language={settings.language || 'vi'}
            onFormat={handleFormat}
            onOpenTableModal={() => setIsTableModalOpen(true)}
            onOpenAiAssistant={() => setIsAiModalOpen(true)}
            onSelectAiAction={handleSelectAiAction}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < historyStack.length - 1}
            selectedText={selectedText}
            activeModel={settings.selectedModel || 'gemini-3.7-flash'}
            isAiStreaming={isAiStreaming}
            onStopAiStream={handleStopAiStream}
          />
        )}

        {/* Center Panes: Editor & Preview & TOC */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative bg-white">
          {/* Editor Pane */}
          {(viewMode === 'split' || viewMode === 'edit') && (
            <div
              className={`h-full min-w-0 ${
                viewMode === 'split' ? 'w-1/2 border-r border-slate-200' : 'w-full'
              }`}
            >
              <MarkdownEditor
                ref={editorRef}
                value={currentContent}
                onChange={handleContentChange}
                onSelectionChange={handleSelectionChange}
                fontSize={settings.fontSize}
                fontFamily={settings.fontFamily}
                lineNumbers={settings.lineNumbers}
                wordWrap={settings.wordWrap}
                placeholder="Bắt đầu soạn thảo Markdown hoặc dùng Gemini AI..."
                onScroll={handleEditorScroll}
                onKeyDownShortcut={handleGlobalKeyDown}
              />
            </div>
          )}

          {/* Live Rendered Preview Pane */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className={`h-full min-w-0 ${viewMode === 'split' ? 'w-1/2' : 'w-full'} bg-white text-slate-850`}>
              <MarkdownPreview
                ref={previewRef}
                content={currentContent}
                isDark={false}
                fontSize={settings.fontSize}
                fontFamily={settings.fontFamily}
                onScroll={handlePreviewScroll}
              />
            </div>
          )}

          {/* Table of Contents Drawer */}
          <TableOfContents
            toc={toc}
            isOpen={isTocOpen}
            onClose={() => setIsTocOpen(false)}
            onSelectHeading={handleJumpToHeading}
            languageTitle={t.nav.tableOfContents}
          />

          {/* Floating AI Streaming Status Indicator */}
          {isAiStreaming && (
            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-indigo-300 shadow-2xl text-slate-800 text-xs animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="font-semibold text-slate-900">
                Gemini đang viết trực tiếp <span className="text-indigo-600 font-bold">{aiStreamingActionName}</span> vào trình soạn thảo...
              </span>
              <button
                onClick={handleStopAiStream}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer"
                title="Dừng viết (Esc)"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Dừng</span>
              </button>
            </div>
          )}

          {/* Floating AI Error Toast */}
          {aiStreamingError && (
            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-300 shadow-2xl text-rose-800 text-xs animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>{aiStreamingError}</span>
              <button
                onClick={() => setAiStreamingError(null)}
                className="ml-2 text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        {!isFocusMode && (
          <footer className="h-8 px-4 flex items-center justify-between border-t border-slate-200 bg-slate-50 text-slate-600 text-[10px] sm:text-[11px] select-none font-mono">
            {/* Left: Document Metrics */}
            <div className="flex items-center gap-3 sm:gap-4 truncate">
              <span>{stats.words} {t.editor.words}</span>
              <span>{stats.characters} {t.editor.characters}</span>
              <span className="hidden sm:inline-block">{stats.lines} {t.editor.lines}</span>
              <span className="hidden md:inline-block">~{stats.readingTimeMinutes} {t.editor.readingTime}</span>
            </div>

            {/* Right: Position, Key indicator, Shortcuts help */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block">
                Dòng {cursorPos.line}, Cột {cursorPos.col}
              </span>

              {/* Gemini Key status badge */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-[10px] cursor-pointer shadow-2xs"
                title="Trạng thái Gemini API Key (Bấm để cài đặt)"
              >
                <Key className="w-3 h-3 text-indigo-600" />
                <span className={settings.geminiApiKey ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {settings.geminiApiKey ? 'BYOK Đã kết nối' : 'Dùng mặc định'}
                </span>
              </button>

              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shadow-2xs"
                title={t.nav.shortcuts}
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </div>
          </footer>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Gemini AI Assistant */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        selectedText={selectedText}
        fullDocumentText={currentContent}
        onApplyReplacement={(newText, mode) => {
          if (!editorRef.current) return;
          if (mode === 'replace') {
            if (selectedText.trim()) {
              editorRef.current.replaceSelection(newText);
            } else {
              handleContentChange(newText);
            }
          } else {
            editorRef.current.insertText(`\n\n${newText}\n`);
          }
        }}
        onUndoLastReplacement={handleUndo}
        canUndo={historyIndex > 0}
        apiKey={settings.geminiApiKey || ''}
        defaultModel={settings.selectedModel || 'gemini-3.7-flash'}
        language={settings.language || 'vi'}
        onOpenSettings={() => {
          setIsAiModalOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* 2. Export Modal (PDF, DOCX, HTML, PNG, XLSX, CSV, MD, TXT) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentTitle={currentDoc?.title || 'Tài liệu'}
        documentContent={currentContent}
        previewElementRef={previewRef}
        isDark={false}
        language={settings.language || 'vi'}
      />

      {/* 3. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onDataReset={refreshData}
      />

      {/* 4. Find & Replace */}
      <FindReplaceModal
        isOpen={isFindModalOpen}
        onClose={() => setIsFindModalOpen(false)}
        editorContent={currentContent}
        onReplace={handleContentChange}
        language={settings.language || 'vi'}
      />

      {/* 5. Table Generator */}
      <TableGeneratorModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsertTable={(tableMd) => {
          editorRef.current?.insertText(`\n${tableMd}\n`);
        }}
        language={settings.language || 'vi'}
      />

      {/* 6. Shortcuts Cheat Sheet */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        language={settings.language || 'vi'}
      />

      {/* 7. Onboarding 3-Step Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          saveSettings({ hasSeenOnboarding: true, theme: 'light' });
        }}
        onOpenSettings={() => {
          setIsOnboardingOpen(false);
          saveSettings({ hasSeenOnboarding: true, theme: 'light' });
          setIsSettingsOpen(true);
        }}
        language={settings.language || 'vi'}
      />

      {/* Floating Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          <div
            className={`flex items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-medium shadow-2xl border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-950/10'
                : toastMessage.type === 'info'
                ? 'bg-indigo-50/95 border-indigo-200 text-indigo-900 shadow-indigo-950/10'
                : 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-950/10'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              ) : toastMessage.type === 'info' ? (
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <div className="leading-relaxed flex-1">{toastMessage.text}</div>
            </div>

            {toastMessage.actionLabel && toastMessage.onAction && (
              <button
                type="button"
                onClick={() => {
                  toastMessage.onAction!();
                  setToastMessage(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 transition-colors shadow-xs cursor-pointer"
              >
                {toastMessage.actionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer shrink-0"
              title="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
