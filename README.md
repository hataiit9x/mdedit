# MDEdit ✍️

> Trình soạn thảo Markdown local-first với trợ lý AI Gemini — tài liệu được lưu trên thiết bị của bạn.

![License](https://img.shields.io/badge/license-MIT-green)
![Built with Google AI Studio](https://img.shields.io/badge/Built%20with-Google%20AI%20Studio-4285F4)
![AI](https://img.shields.io/badge/AI-Gemini-8E75B2)
![Privacy](https://img.shields.io/badge/Privacy-Local--first-blueviolet)

MDEdit được xây dựng cho **AI Riser Vietnam 2026** (#BuildwithGoogleAI) — chuyển hóa ý tưởng từ dự án mdtools thành một ứng dụng mã nguồn mở, hoàn toàn miễn phí, vibe-code bằng Google AI Studio.

## 💡 Ý tưởng

Các trình soạn thảo Markdown hiện có thường yêu cầu đăng ký tài khoản, lưu tài liệu lên server của họ, hoặc trả phí để dùng AI. MDEdit đi ngược lại:

1. **Privacy-first** — không tài khoản, không tracking, không lưu tài liệu trên server. Mọi tài liệu nằm trong IndexedDB của trình duyệt.
2. **Mã nguồn mở MIT** — tính năng AI hỗ trợ **BYOK (Bring Your Own Key)** hoặc secret dùng chung do bản triển khai cấu hình. Free Tier và quota phụ thuộc chính sách của nhà cung cấp AI.
3. **AI thật sự hữu ích** — 8 hành động viết một cú click: cải thiện văn phong, sửa ngữ pháp, tóm tắt, mở rộng, dịch 8 ngôn ngữ, dàn ý, viết tiếp, giải thích đơn giản.

## ✨ Tính năng

- ✅ Soạn thảo Markdown chia đôi màn hình, preview realtime (GFM, highlight code, KaTeX, Mermaid)
- ✅ Trợ lý viết AI bằng Gemini API (@google/genai)
- ✅ BYOK: tự mang API key, có nút test key, chọn model Gemini 3.7 / 3.6 / 3.1
- ✅ Lưu local-first: IndexedDB + autosave 2 giây, thư mục, tìm kiếm, ghim tài liệu
- ✅ Mở / lưu file `.md` trực tiếp trên máy (File System Access API)
- ✅ Backup / khôi phục toàn bộ tài liệu bằng 1 file JSON
- ✅ Xuất PDF / HTML / DOCX / PNG / XLSX
- ✅ Dark mode mặc định, giao diện tiếng Việt & tiếng Anh

Chi tiết đặc tả: [docs/IDEA.md](docs/IDEA.md)

## 🔗 Liên kết

| Nội dung | Đường dẫn |
|---|---|
| 🚀 Ứng dụng (deployed) | [mdedit.ai.studio](https://mdedit.ai.studio) |
| 🧪 Dự án AI Studio | [Mở trong Google AI Studio](https://ai.studio/apps/efbc27d0-7378-4aa9-9994-0e7c7b808584) |
| 🎬 Video demo | [Xem trên YouTube](https://www.youtube.com/watch?v=S85m2lqf3Uw) |
| 📣 Bài chia sẻ | [LinkedIn — Tai Ha](https://www.linkedin.com/posts/hatai-it9x_buildwithgoogleai-airiservietnam2026-mdedit-share-7497910968891396096-bnmF/) |
| 📋 Đặc tả ý tưởng | [docs/IDEA.md](docs/IDEA.md) |
| 🤖 Prompt dùng để vibe-code | [docs/PROMPT.md](docs/PROMPT.md) |
| 🏆 Checklist tham gia cuộc thi | [docs/AIRISER-2026.md](docs/AIRISER-2026.md) |

## 🔑 Lấy Gemini API key miễn phí (1 phút)

1. Truy cập <https://aistudio.google.com/apikey>
2. Đăng nhập tài khoản Google → **Create API key**
3. Mở MDEdit → Settings → dán key → **Test key** — xong!

Mặc định key chỉ nằm trong bộ nhớ của tab. Nếu bật “Ghi nhớ”, key được mã hóa AES-GCM trong IndexedDB. Gemini BYOK được gửi thẳng từ trình duyệt tới Google; MDEdit không chuyển tiếp key cá nhân qua proxy của mình. Chỉ nội dung bạn chủ động yêu cầu AI xử lý mới được gửi tới nhà cung cấp AI.

## 🛠️ Công nghệ

Google AI Studio (vibe-coding) · Gemini API · React + Vite + Tailwind CSS · Dexie (IndexedDB) · react-markdown / KaTeX / Mermaid · docx / SheetJS

## 🔐 Mô hình dữ liệu & riêng tư

- Tài liệu, thư mục và cài đặt được lưu cục bộ trong IndexedDB; backup không chứa API key.
- Khi dùng Gemini BYOK, trình duyệt gọi trực tiếp Google Gemini API.
- Khi bản triển khai có `GEMINI_API_KEY`, proxy chỉ sử dụng secret phía server và không nhận key cá nhân.
- MDEdit không có tài khoản, analytics hoặc kho tài liệu phía server.

## 📄 Giấy phép

[MIT](LICENSE) — Copyright (c) 2026 Tai.Ha
