export type Language = 'en' | 'vi';

export type Theme = 'dark' | 'light' | 'system';

export type PaneMode = 'split' | 'editor' | 'preview' | 'edit';
export type ViewMode = PaneMode;

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  folderId?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isTrash?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  lastSyncedHandleName?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TrashItem extends DocumentItem {
  deletedAt: number;
}

export interface AppSettings {
  geminiApiKey: string;
  selectedModel: string;
  language: Language;
  theme: Theme;
  fontSize: number; // e.g. 15, 16, 18
  fontFamily: 'sans' | 'serif' | 'mono';
  lineNumbers: boolean;
  wordWrap: boolean;
  syncScroll: boolean;
  autoSaveIntervalMs: number;
  hasSeenOnboarding: boolean;
  defaultPaneMode: PaneMode;
}

export type AiActionType =
  | 'improve'
  | 'grammar'
  | 'summarize'
  | 'expand'
  | 'translate'
  | 'outline'
  | 'continue'
  | 'simplify'
  | 'custom';

export type TranslationTargetLanguage =
  | 'Vietnamese'
  | 'English'
  | 'Japanese'
  | 'Chinese'
  | 'Korean'
  | 'French'
  | 'German'
  | 'Spanish';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  paragraphs: number;
  readingTimeMinutes: number;
}

export interface UndoHistoryEntry {
  documentId: string;
  previousContent: string;
  actionName: string;
  timestamp: number;
}
