# Prompt vibe-code MDEdit trong Google AI Studio

> Quy trình chính thức theo Participant Handbook của AI Riser Vietnam 2026.
> Vào **<https://ai.dev>** → **Build** → **+ New app** → chọn integration **Gemini API** → dán prompt bên dưới → **Build**.

## ⚠️ Trước khi bắt đầu

Dùng một **tài khoản Google chưa từng publish app nào trên AI Studio** để được
**Starter Tier** — publish miễn phí, không cần thẻ tín dụng. Nếu bị hỏi thẻ →
thử ẩn danh hoặc đổi tài khoản.

## Mega prompt (dán nguyên văn)

```text
System Role: You are an expert full-stack developer and UX/UI designer known for creating
beautiful, intuitive, and highly functional web applications.

Task: Build "MDEdit" — a free, open-source, privacy-first Markdown editor with an AI
writing assistant powered by the Gemini API. The app runs 100% in the browser with NO
backend: every document stays on the user's device. No accounts, no servers, no tracking.
Users bring their own Gemini API key (BYOK) so the app is free forever.

Core Features:

1. Editor & Live Preview
- Split-pane layout: Markdown source on the left, live rendered preview on the right
  (GitHub Flavored Markdown, code syntax highlighting, auto heading slugs)
- Formatting toolbar (bold, italic, heading, lists, table, code, link, image)
- Auto-generated Table of Contents from headings
- Math equations (KaTeX) and Mermaid diagrams (flowcharts, sequence diagrams)
- Find & replace, go to line, undo/redo, keyboard shortcuts, fullscreen focus mode

2. AI Writing Assistant (Gemini API — this is the core integration)
- Use the @google/genai SDK. If an environment API key is available, use it; otherwise
  show a Settings dialog where the user pastes their own free Gemini API key (with a link
  to aistudio.google.com/apikey and a "Test key" button). Store the key in localStorage.
- Model selector: default "gemini-2.5-flash", optional "gemini-2.5-pro"
- 8 one-click actions on the selected text, each with a fixed system instruction:
  • Improve: "You are a writing assistant. Improve the following text for clarity,
    style, and readability while maintaining the original meaning. Return only the
    improved text without explanations."
  • Fix grammar: "You are a grammar checker. Fix all spelling, grammar, and punctuation
    errors. Return only the corrected text without explanations."
  • Summarize: "You are a summarization expert. Create a concise summary. Return only
    the summary."
  • Expand: "You are a content expander. Expand this text with more details, examples,
    and explanations while maintaining the original style."
  • Translate: "You are a translator. Translate this text to {language}. Return only the
    translated text." (Vietnamese, English, Japanese, Chinese, Korean, French, German, Spanish)
  • Outline: "You are a document organizer. Create a structured outline using markdown
    headings. Return only the outline."
  • Continue: "You are a writing assistant. Continue writing in the same style and tone.
    Return only the continuation."
  • Explain simply: "You are a simplification expert. Simplify this text to make it
    easier to understand. Return only the simplified text."
- After each action, let the user Replace the selection or Insert below, with an undo option

3. Local-first storage (no backend)
- Documents and folders stored in IndexedDB (use Dexie), autosaved every 2 seconds
- Sidebar: document list, full-text search, pin favorites, folder organization
- Open and save .md files with the File System Access API (download fallback for
  unsupported browsers)
- One-click backup / restore of all documents as a single JSON file

4. Export
- PDF (print-optimized), standalone HTML, DOCX, PNG image of the preview,
  and markdown tables to XLSX/CSV

5. UI / The Vibe
- Aesthetic: clean, minimalist — a mix between Notion and Apple Notes
- Dark mode by default with a light mode toggle; soft shadows, rounded corners,
  gentle hover states and smooth transitions
- UI language switcher: Vietnamese and English
- Onboarding screen for first-time users explaining the BYOK concept in 3 short steps

Output constraints: provide complete, working code with no placeholders like
"// add logic here".
```

## Các vòng iterate (sau lần Build đầu tiên)

Sửa lỗi (theo mẫu trong handbook):

```text
Please fix this error "{paste error message}"
```

Thêm / chỉnh tính năng — ví dụ:

```text
Please add a footer with keyboard shortcuts cheat sheet, and make the sidebar collapsible on mobile.
```

Nhập code đã kiểm chứng từ mdtools khi cần chất lượng cao (ví dụ logic export DOCX):

```text
Replace your DOCX export implementation with this exact working code:
{paste code}
```

## Sau khi hoàn thành

1. **Share** (góc phải trên) → access **Public** → **Copy Link** → đây là *AI Studio link* bắt buộc trong form.
2. **Publish** → **Get started** → đặt mô tả + URL → nhận link `https://<ten-app>.ai.studio` → +10 điểm.
3. Đồng bộ code về repo GitHub này (AI Studio hỗ trợ kết nối GitHub) và cập nhật link vào README.
