# MDEdit ✍️

> Trình soạn thảo Markdown với trợ lý AI Gemini — chạy 100% trong trình duyệt, dữ liệu không bao giờ rời máy bạn.

![License](https://img.shields.io/badge/license-MIT-green)
![Built with Google AI Studio](https://img.shields.io/badge/Built%20with-Google%20AI%20Studio-4285F4)
![AI](https://img.shields.io/badge/AI-Gemini-8E75B2)
![Privacy](https://img.shields.io/badge/Privacy-Local--first-blueviolet)

MDEdit được xây dựng cho **AI Riser Vietnam 2026** (#BuildwithGoogleAI) — chuyển hóa ý tưởng từ dự án mdtools thành một ứng dụng mã nguồn mở, hoàn toàn miễn phí, vibe-code bằng Google AI Studio.

## 💡 Ý tưởng

Các trình soạn thảo Markdown hiện có thường yêu cầu đăng ký tài khoản, lưu tài liệu lên server của họ, hoặc trả phí để dùng AI. MDEdit đi ngược lại:

1. **Privacy-first** — không backend, không tài khoản, không tracking. Mọi tài liệu lưu ngay trên máy người dùng (IndexedDB).
2. **Miễn phí vĩnh viễn** — mã nguồn mở MIT. Tính năng AI chạy theo mô hình **BYOK (Bring Your Own Key)**: người dùng dán Gemini API key miễn phí của riêng mình vào Settings.
3. **AI thật sự hữu ích** — 8 hành động viết một cú click: cải thiện văn phong, sửa ngữ pháp, tóm tắt, mở rộng, dịch 8 ngôn ngữ, dàn ý, viết tiếp, giải thích đơn giản.

## ✨ Tính năng

- ✅ Soạn thảo Markdown chia đôi màn hình, preview realtime (GFM, highlight code, KaTeX, Mermaid)
- ✅ Trợ lý viết AI bằng Gemini API (@google/genai)
- ✅ BYOK: tự mang API key, có nút test key, chọn model (gemini-2.5-flash / pro)
- ✅ Lưu local-first: IndexedDB + autosave 2 giây, thư mục, tìm kiếm, ghim tài liệu
- ✅ Mở / lưu file `.md` trực tiếp trên máy (File System Access API)
- ✅ Backup / khôi phục toàn bộ tài liệu bằng 1 file JSON
- ✅ Xuất PDF / HTML / DOCX / PNG / XLSX
- ✅ Dark mode mặc định, giao diện tiếng Việt & tiếng Anh

Chi tiết đặc tả: [docs/IDEA.md](docs/IDEA.md)

## 🔗 Liên kết

| Nội dung | Đường dẫn |
|---|---|
| 🚀 Ứng dụng (deployed) | _cập nhật sau khi Publish từ AI Studio_ |
| 🧪 Dự án AI Studio | _cập nhật_ |
| 🎬 Video demo | _cập nhật_ |
| 📋 Đặc tả ý tưởng | [docs/IDEA.md](docs/IDEA.md) |
| 🤖 Prompt dùng để vibe-code | [docs/PROMPT.md](docs/PROMPT.md) |
| 🏆 Checklist tham gia cuộc thi | [docs/AIRISER-2026.md](docs/AIRISER-2026.md) |

## 🔑 Lấy Gemini API key miễn phí (1 phút)

1. Truy cập <https://aistudio.google.com/apikey>
2. Đăng nhập tài khoản Google → **Create API key**
3. Mở MDEdit → Settings → dán key → **Test key** — xong!

Key chỉ lưu trong `localStorage` của trình duyệt chính bạn, không gửi đi đâu khác ngoài Google Gemini API.

## 🛠️ Công nghệ

Google AI Studio (vibe-coding) · Gemini API · React + Vite + Tailwind + shadcn/ui · Dexie (IndexedDB) · react-markdown / KaTeX / Mermaid · docx / xlsx

## 📄 Giấy phép

[MIT](LICENSE) — Copyright (c) 2026 Tai.Ha
