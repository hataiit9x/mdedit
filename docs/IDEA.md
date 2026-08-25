# Đặc tả ý tưởng MDEdit

> Tài liệu này là "bản thiết kế" của MDEdit — được rút ra từ kinh nghiệm xây dựng dự án mdtools
> (trình soạn thảo Markdown SaaS có backend FastAPI + Supabase + subscription), rồi đơn giản hóa
> thành ứng dụng client-side hoàn toàn cho AI Riser Vietnam 2026.

## 1. Tuyên ngôn sản phẩm

**"Tài liệu của bạn ở lại với bạn. Bạn chủ động chọn nội dung gửi tới AI."**

- Không cần đăng ký, không cần đăng nhập
- Không có server lưu tài liệu — tất cả nằm trong trình duyệt (IndexedDB)
- AI dùng Gemini API key của người dùng (BYOK) hoặc secret của bản triển khai; Free Tier và quota do Google quy định
- Chỉ nội dung người dùng yêu cầu AI xử lý mới rời thiết bị

## 2. Người dùng mục tiêu

| Persona | Nỗi đau | MDEdit giải quyết |
|---|---|---|
| Sinh viên viết bài tập, luận văn | Word nặng, muốn viết nhanh + xuất đẹp, cần AI hỗ trợ nhưng không có tiền trả subscription | Miễn phí + BYOK key free của Google |
| Kỹ sư viết tài liệu / README / báo cáo | Cần Markdown chuẩn, sơ đồ Mermaid, công thức toán, xuất DOCX cho người không biết Markdown | Editor đầy đủ + export đa định dạng |
| Người quan tâm riêng tư | Không muốn toàn bộ kho ghi chú nằm trên server bên thứ ba | Local-first; chỉ nội dung được chọn mới gửi tới AI |

## 3. Tính năng chi tiết

### 3.1 Editor & Preview
- Bố cục chia đôi: nguồn Markdown bên trái, preview realtime bên phải
- Markdown: GitHub Flavored (bảng, task list), highlight code, heading slug
- Toolbar định dạng nhanh: bold, italic, heading, list, table, code, link, image
- Mục lục (TOC) tự sinh từ heading
- Công thức toán KaTeX; sơ đồ Mermaid (flowchart, sequence, class...)
- Find & Replace, Go to line, Undo/Redo, phím tắt, chế độ tập trung fullscreen

### 3.2 Trợ lý viết AI (Gemini API — tích hợp cốt lõi)
- SDK: `@google/genai`. Nếu có secret server thì dùng proxy; nếu người dùng nhập BYOK thì trình duyệt gọi thẳng Google.
- Settings dialog: ô dán key + link `aistudio.google.com/apikey` + nút **Test key**; mặc định lưu trong phiên, tùy chọn mã hóa AES-GCM trong IndexedDB.
- Chọn model: `gemini-3.7-flash` (mặc định), `gemini-3.6-flash`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`.
- 8 hành động áp dụng lên đoạn văn bản đang chọn, mỗi hành động có system prompt cố định:

  | Hành động | System prompt |
  |---|---|
  | Improve | You are a writing assistant. Improve the following text for clarity, style, and readability while maintaining the original meaning. Return only the improved text without explanations. |
  | Fix grammar | You are a grammar checker. Fix all spelling, grammar, and punctuation errors in the following text. Return only the corrected text without explanations. |
  | Summarize | You are a summarization expert. Create a concise summary of the following text. Return only the summary without explanations. |
  | Expand | You are a content expander. Expand the following text with more details, examples, and explanations while maintaining the original style. Return only the expanded text. |
  | Translate | You are a translator. Translate the following text to {language}. Return only the translated text. (Vi, En, Ja, Zh, Ko, Fr, De, Es) |
  | Outline | You are a document organizer. Create a structured outline from the following text using markdown headings. Return only the outline. |
  | Continue | You are a writing assistant. Continue writing the following text in the same style and tone. Return only the continuation. |
  | Explain simply | You are a simplification expert. Simplify the following text to make it easier to understand. Return only the simplified text. |

- Sau khi AI trả kết quả: cho người dùng chọn **Replace** (thay đoạn đang chọn) hoặc **Insert below**, luôn có undo.

### 3.3 Lưu trữ local-first (thay thế hoàn toàn backend)
- Documents + folders trong IndexedDB (Dexie), autosave mỗi 2 giây
- Sidebar: danh sách tài liệu, tìm kiếm full-text, ghim, sắp xếp thư mục
- Mở / lưu file `.md` bằng File System Access API (fallback: tải file)
- **Backup/Restore**: xuất/nạp toàn bộ tài liệu bằng 1 file JSON — chuyển máy dễ dàng

### 3.4 Export (100% client-side)
- PDF (bản in tối ưu), HTML (file độc lập), DOCX (thư viện docx, giữ style bảng/heading),
  PNG của preview, bảng Markdown → XLSX/CSV

### 3.5 UI/UX
- Thẩm mỹ: tối giản kiểu Notion × Apple Notes; dark mode mặc định + toggle light
- Micro-interaction nhẹ: hover state, transition mượt khi chuyển tài liệu
- Đa ngôn ngữ: tiếng Việt & tiếng Anh
- Onboarding lần đầu: giải thích BYOK trong 3 bước ngắn

## 4. Những gì đã bỏ khỏi mdtools — và lý do

| Bỏ | Lý do |
|---|---|
| Backend lưu tài liệu FastAPI + PostgreSQL | Tài liệu local-first không cần server; Express chỉ làm proxy AI tùy chọn và phục vụ web |
| Đăng nhập / OAuth | Giảm ma sát; privacy-first nghĩa là không cần biết người dùng là ai |
| Subscription / thanh toán (LemonSqueezy) | MDEdit không thu phí; chi phí/quota AI thuộc tài khoản hoặc bản triển khai |
| Usage tracking | Không theo dõi người dùng; proxy AI tùy chọn chỉ rate-limit theo IP trong bộ nhớ để bảo vệ quota |
| Realtime collaboration, share link | Phạm v1 quá lớn; để làm sau (roadmap) |

## 5. Differentiators (vì sao giám khảo nên chọn sản phẩm này)

1. **Mô hình BYOK thông minh**: app published trên AI Studio dùng env key (giám khảo mở là dùng được ngay), bản open-source self-host dùng key người dùng — một codebase, hai chế độ.
2. **Tích hợp sâu công nghệ Google**: Google AI Studio (build + publish), Gemini API (@google/genai, 8 tác vụ), hướng đến bonus Firebase sync / Drive import (roadmap).
3. **Có sản phẩm thật làm nền**: ý tưởng được kiểm chứng qua mdtools — giờ tối ưu lại thành bản miễn phí, mở, riêng tư hơn.
