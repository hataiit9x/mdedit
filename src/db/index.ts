import Dexie, { Table } from 'dexie';
import { DocumentItem, FolderItem, AppSettings, Language } from '../types';

export class MDEditDB extends Dexie {
  documents!: Table<DocumentItem, string>;
  folders!: Table<FolderItem, string>;
  settingsTable!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super('MDEditDB');
    this.version(1).stores({
      documents: 'id, title, folderId, isPinned, isArchived, isTrash, createdAt, updatedAt',
      folders: 'id, name, createdAt, updatedAt',
      settingsTable: 'id',
    });
  }
}

export const db = new MDEditDB();

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  selectedModel: 'gemini-3.7-flash',
  language: 'vi',
  theme: 'light',
  fontSize: 15,
  fontFamily: 'sans',
  lineNumbers: true,
  wordWrap: true,
  syncScroll: true,
  autoSaveIntervalMs: 2000,
  hasSeenOnboarding: false,
  defaultPaneMode: 'split',
};

const SAMPLE_DOC_EN: DocumentItem = {
  id: 'welcome-guide-en',
  title: '🚀 Welcome to MDEdit — Feature Showcase',
  content: `# Welcome to MDEdit

MDEdit is a **privacy-first**, open-source Markdown workspace with an integrated **Gemini AI Writing Assistant**. Every document and folder is stored **100% locally in your browser** via IndexedDB.

---

## ⚡ Key Highlights
- 🔒 **Zero Telemetry**: No accounts, no tracking cookies, no server-side document storage.
- 🤖 **Bring Your Own Key (BYOK)**: Use your free Gemini API key with zero subscription costs.
- 📐 **Math & Diagrams**: Live KaTeX formulas and Mermaid chart rendering.
- 💾 **File System Access**: Open, edit, and save directly to your local files.
- 📦 **Rich Export**: Export to **PDF**, **Word (DOCX)**, **Standalone HTML**, **PNG**, and **CSV/XLSX**.

---

## 📊 GitHub Flavored Markdown (GFM) Tables

| Feature | Local Browser | Cloud Server | Privacy Level |
| :--- | :---: | :---: | :--- |
| **Document Storage** | IndexedDB (Dexie) | ❌ None | 100% On-device |
| **AI Processing** | Direct via Gemini API | ❌ None | BYOK (Your Key) |
| **Export Formats** | PDF, DOCX, HTML, PNG, XLSX | ❌ None | Instant Client-side |

---

## 🧮 Math Equations (KaTeX)

You can write inline math like $f(x) = \\int_{-\\infty}^\\infty e^{-x^2} dx$ or block equations:

$$
\\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^N (x_i - \\mu)^2}
$$

$$
\\mathcal{L}_{\\text{total}} = \\lambda_1 \\mathcal{L}_{\\text{recon}} + \\lambda_2 \\mathcal{L}_{\\text{KL}}
$$

---

## 🌲 Mermaid Diagrams

\`\`\`mermaid
flowchart TD
    A[Start Writing Markdown] --> B{Select Text}
    B -->|Click AI Assistant| C[Choose 1 of 8 AI Actions]
    C --> D[Review AI Diff Preview]
    D -->|Accept| E[Replace or Insert Below]
    D -->|Revert| F[1-Click Undo]
    E --> G[Export to DOCX / PDF / HTML]
\`\`\`

---

## 💻 Code Highlighting

\`\`\`typescript
import { GoogleGenAI } from "@google/genai";

// MDEdit connects directly using your BYOK Gemini API key
export async function enhanceText(input: string, action: string) {
  const ai = new GoogleGenAI({ apiKey: localStorage.getItem("gemini_key") });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: input,
  });
  return response.text;
}
\`\`\`

---

## 📝 Task Lists
- [x] Create a new document in MDEdit
- [x] Configure your free Gemini API key in **Settings**
- [ ] Highlight any paragraph and press **Ctrl+Shift+A** for AI writing assistant
- [ ] Try exporting this note as a **Word Document (.docx)** or **PDF**

> *"Simplicity is prerequisite for reliability."* — Edsger W. Dijkstra
`,
  folderId: null,
  isPinned: true,
  isArchived: false,
  isTrash: false,
  tags: ['Guide', 'Getting Started'],
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
};

const SAMPLE_DOC_VI: DocumentItem = {
  id: 'welcome-guide-vi',
  title: '🇻🇳 Hướng dẫn sử dụng MDEdit & Trợ lý AI',
  content: `# Chào mừng bạn đến với MDEdit

MDEdit là trình soạn thảo Markdown **bảo mật tuyệt đối**, hoạt động **100% cục bộ trên trình duyệt** (IndexedDB) và tích hợp **Trợ lý AI Gemini**.

---

## 🌟 Điểm nổi bật
- 🛡️ **Bảo mật tuyệt đối**: Dữ liệu không bao giờ rời khỏi thiết bị của bạn.
- 🔑 **Mô hình BYOK**: Tự mang khóa Gemini API miễn phí để dùng không giới hạn.
- 📐 **Công thức toán & Sơ đồ**: Hỗ trợ KaTeX ($$) và Mermaid trực quan.
- 📄 **Xuất đa định dạng**: Hỗ trợ **DOCX (Word)**, **PDF in ấn**, **HTML độc lập**, **PNG**, **CSV/Excel**.

---

## 📊 Bảng biểu Markdown (GFM)

| Chức năng | Cơ chế hoạt động | Bảo mật |
| :--- | :--- | :--- |
| **Lưu trữ ghi chú** | IndexedDB trên máy | 100% Cục bộ |
| **Trợ lý viết AI** | Gemini 2.5 Flash / Pro | Khóa riêng (BYOK) |
| **Xuất tệp** | Xử lý trực tiếp trên trình duyệt | An toàn tuyệt đối |

---

## 🧮 Công thức toán học (KaTeX)

Viết công thức nội dòng $E = mc^2$ hoặc khối công thức:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

---

## 🌲 Sơ đồ Mermaid trực quan

\`\`\`mermaid
sequenceDiagram
    autonumber
    User->>MDEdit: Nhập nội dung Markdown
    User->>MDEdit: Bôi đen văn bản & Chọn Trợ lý AI
    MDEdit->>Gemini API: Gửi yêu cầu với System Instruction
    Gemini API-->>MDEdit: Trả về kết quả tối ưu
    MDEdit->>User: Xem trước & Thay thế với 1 cú nhấp
\`\`\`

---

## 🎯 8 Tính năng AI có sẵn:
1. **Cải thiện câu chữ**: Nâng cao văn phong, sự trôi chảy.
2. **Sửa ngữ pháp & chính tả**: Làm sạch lỗi từ ngữ.
3. **Tóm tắt**: Rút trích các ý trọng tâm.
4. **Mở rộng**: Bổ sung dẫn chứng, giải thích chi tiết.
5. **Dịch thuật**: Chuyển ngữ sang 8 ngôn ngữ phổ biến.
6. **Tạo dàn ý**: Tổ chức thành các đề mục Markdown chuẩn.
7. **Viết tiếp**: Viết liền mạch đoạn văn kế tiếp.
8. **Giải thích đơn giản**: Diễn giải bằng từ ngữ dễ hiểu.
`,
  folderId: null,
  isPinned: true,
  isArchived: false,
  isTrash: false,
  tags: ['Hướng dẫn', 'Tiếng Việt'],
  createdAt: Date.now() - 1800000,
  updatedAt: Date.now(),
};

let initPromise: Promise<void> | null = null;

export async function initDatabase(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const docCount = await db.documents.count();
      if (docCount === 0) {
        // Use bulkPut to ensure duplicate key constraint errors never throw during concurrent startup
        await db.documents.bulkPut([SAMPLE_DOC_EN, SAMPLE_DOC_VI]);
      }

      const existingSettings = await db.settingsTable.get('app_settings');
      if (!existingSettings) {
        await db.settingsTable.put({ ...DEFAULT_SETTINGS, id: 'app_settings' });
      }
    } catch (err) {
      console.warn('Database initialization warning:', err);
    }
  })();

  return initPromise;
}

export async function getAppSettings(): Promise<AppSettings> {
  const settings = await db.settingsTable.get('app_settings');
  if (!settings) {
    return DEFAULT_SETTINGS;
  }
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  if (
    !merged.selectedModel ||
    merged.selectedModel === 'gemini-2.5-flash' ||
    merged.selectedModel === 'gemini-2.0-flash' ||
    merged.selectedModel === 'gemini-1.5-flash'
  ) {
    merged.selectedModel = 'gemini-3.7-flash';
  } else if (merged.selectedModel === 'gemini-2.5-pro' || merged.selectedModel === 'gemini-2.0-pro') {
    merged.selectedModel = 'gemini-3.1-pro-preview';
  }
  return merged;
}

export async function saveAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const updated: AppSettings & { id: string } = {
    ...current,
    ...settings,
    id: 'app_settings',
  };
  await db.settingsTable.put(updated);
  return updated;
}

export async function getAllDocuments(): Promise<DocumentItem[]> {
  return await db.documents.orderBy('updatedAt').reverse().toArray();
}

export async function getDocumentById(id: string): Promise<DocumentItem | undefined> {
  return await db.documents.get(id);
}

export async function createDocument(doc?: Partial<DocumentItem>): Promise<DocumentItem> {
  const newDoc: DocumentItem = {
    id: doc?.id || ('doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    title: doc?.title || 'Untitled Document',
    content: doc?.content || '',
    folderId: doc?.folderId || null,
    isPinned: false,
    isArchived: false,
    isTrash: false,
    tags: doc?.tags || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...doc,
  };
  await db.documents.put(newDoc);
  return newDoc;
}

export async function updateDocument(id: string, updates: Partial<DocumentItem>): Promise<DocumentItem | null> {
  const existing = await db.documents.get(id);
  if (!existing) return null;
  const updated: DocumentItem = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };
  await db.documents.put(updated);
  return updated;
}

export async function moveDocumentToTrash(id: string): Promise<boolean> {
  const existing = await db.documents.get(id);
  if (!existing) return false;
  await db.documents.update(id, { isTrash: true, updatedAt: Date.now() });
  return true;
}

export async function restoreDocumentFromTrash(id: string): Promise<boolean> {
  const existing = await db.documents.get(id);
  if (!existing) return false;
  await db.documents.update(id, { isTrash: false, updatedAt: Date.now() });
  return true;
}

export async function deleteDocumentPermanently(id: string): Promise<boolean> {
  await db.documents.delete(id);
  return true;
}

export async function emptyTrash(): Promise<number> {
  const trashDocs = await db.documents.filter(d => Boolean(d.isTrash)).toArray();
  const ids = trashDocs.map(d => d.id);
  await db.documents.bulkDelete(ids);
  return ids.length;
}

export async function getAllFolders(): Promise<FolderItem[]> {
  return await db.folders.orderBy('name').toArray();
}

export async function createFolder(name: string, color?: string): Promise<FolderItem> {
  const folder: FolderItem = {
    id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim(),
    color: color || '#6366f1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.folders.put(folder);
  return folder;
}

export async function updateFolder(id: string, name: string, color?: string): Promise<FolderItem | null> {
  const existing = await db.folders.get(id);
  if (!existing) return null;
  const updated: FolderItem = {
    ...existing,
    name: name.trim(),
    color: color || existing.color,
    updatedAt: Date.now(),
  };
  await db.folders.put(updated);
  return updated;
}

export async function deleteFolder(id: string): Promise<boolean> {
  // Move documents in this folder to root
  const docsInFolder = await db.documents.where('folderId').equals(id).toArray();
  for (const doc of docsInFolder) {
    await db.documents.update(doc.id, { folderId: null });
  }
  await db.folders.delete(id);
  return true;
}

export async function exportAllDataJson(): Promise<string> {
  const docs = await db.documents.toArray();
  const folders = await db.folders.toArray();
  const settings = await getAppSettings();

  const backup = {
    appName: 'MDEdit',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    documents: docs,
    folders: folders,
    settings: {
      ...settings,
      geminiApiKey: '', // For security, do not export raw API key
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function importDataJson(jsonString: string): Promise<{ docsImported: number; foldersImported: number }> {
  const data = JSON.parse(jsonString);
  let docsImported = 0;
  let foldersImported = 0;

  if (Array.isArray(data.folders)) {
    for (const folder of data.folders) {
      if (folder && folder.id && folder.name) {
        await db.folders.put(folder);
        foldersImported++;
      }
    }
  }

  if (Array.isArray(data.documents)) {
    for (const doc of data.documents) {
      if (doc && doc.id && doc.title !== undefined) {
        await db.documents.put(doc);
        docsImported++;
      }
    }
  }

  return { docsImported, foldersImported };
}

export async function getStorageEstimate(): Promise<{ usageKb: number; docCount: number; folderCount: number }> {
  const docCount = await db.documents.count();
  const folderCount = await db.folders.count();
  const docs = await db.documents.toArray();
  const totalChars = docs.reduce((acc, d) => acc + (d.content?.length || 0) + (d.title?.length || 0), 0);
  const usageKb = Math.round((totalChars * 2) / 1024) || 1; // Approx UTF-16 bytes

  return { usageKb, docCount, folderCount };
}

export const initSampleData = initDatabase;
export const getSettings = getAppSettings;
export const saveSettings = saveAppSettings;
export const deleteDocument = deleteDocumentPermanently;
