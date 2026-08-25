# Checklist tham gia AI Riser Vietnam 2026 — #BuildwithGoogleAI

## Thông tin chương trình

| Hạng mục | Điểm |
|---|---|
| Đánh giá sản phẩm (sáng tạo, khả thi, tác động) | tối đa 100 |
| Tích hợp sâu công nghệ Google (Gemini, Firebase, Maps, Workspace) | +10 |
| Deploy thật (web: publish/Cloud Run · mobile: Google Play) | +10 |
| Nộp form trong 200 đơn đầu tiên | +3 |

- Mỗi email được nộp **1 project duy nhất**; quà gửi về địa chỉ tại Việt Nam; top 500 có quà.
- Hỏi đáp cộng đồng: <https://slack.airiservietnam.dev/>
- Handbook: <https://goo.gle/airiser-handbook>

## Bắt buộc chuẩn bị trước khi nộp form

- [ ] **AI Studio link**: app được build bằng Google AI Studio (Share → Public → Copy link)
- [ ] **Video demo**: YouTube public
- [x] **Bài social post**: [LinkedIn — Tai Ha](https://www.linkedin.com/posts/hatai-it9x_buildwithgoogleai-airiservietnam2026-mdedit-share-7497910968891396096-bnmF/) (public, đầy đủ video + hành trình + câu chuyện cá nhân)

## Lộ trình thực hiện

### Bước 0 — Chuẩn bị (1 buổi)
- [ ] Tạo tài khoản Google chưa từng publish app trên AI Studio (để được Starter Tier publish miễn phí)
- [ ] Clone repo này về máy: `git clone https://github.com/hataiit9x/mdedit.git`
- [ ] Đọc `docs/IDEA.md` (đặc tả) và `docs/PROMPT.md` (prompt + quy trình)

### Bước A — Vibe-code trong AI Studio (1–2 ngày)
- [ ] Vào <https://ai.dev> → Build → + New app → chọn integration Gemini API
- [ ] Dán mega prompt trong `docs/PROMPT.md` → Build
- [ ] Iterate: sửa lỗi, tinh chỉnh UI, thêm tính năng (xem mẫu prompt trong `docs/PROMPT.md`)
- [ ] Test kỹ: autosave, mở/lưu file, 8 hành động AI, export

### Bước B — Lấy 2 link
- [ ] **AI Studio link**: Share → access Public → Copy Link *(bắt buộc)*
- [ ] **Deployed link**: Publish → Get started → đặt URL (vd `mdedit.ai.studio`) *(+10 điểm)*
- [ ] Kết nối GitHub trong AI Studio để đồng bộ code về repo này
- [ ] Cập nhật 2 link + link video vào `README.md`

### Bước C — Video demo YouTube (~2–3 phút, public)
Kịch bản gợi ý:
1. (20s) Câu chuyện cá nhân: vì sao mình làm MDEdit — "ghi chú của tôi nằm trên server người khác, và tôi không muốn trả phí cho AI"
2. (30s) Giới thiệu: open-source, local-first, BYOK, build bằng Google AI Studio
3. (60s) Demo chính: soạn Markdown (bảng, công thức, Mermaid) → dán API key → chạy 2–3 hành động AI (improve, translate sang tiếng Việt) → export DOCX
4. (30s) Backup JSON + dark mode + chuyển ngôn ngữ
5. (20s) Kết: link GitHub + lời mời dùng thử + #BuildwithGoogleAI
- [ ] Quay màn hình 1080p, giọng đọc rõ, thêm phụ đề
- [ ] Upload public, điền mô tả đầy đủ link

### Bước D — Social post
- [x] Đăng public trên [LinkedIn](https://www.linkedin.com/posts/hatai-it9x_buildwithgoogleai-airiservietnam2026-mdedit-share-7497910968891396096-bnmF/): hành trình build với AI Studio + Gemini, khó khăn & cách giải quyết, link video và link app
- [x] Hashtag: #BuildwithGoogleAI #AIRiserVietnam2026

### Bước E — Nộp form (làm sớm cho kịp 200 đơn đầu!)
- [ ] Form hoàn thành: <https://goo.gle/airiservietnam-completion>
- [ ] Điền: email, họ tên (khớp chứng nhận), email đăng ký chương trình, địa chỉ nhà (số nhà → đường → phường/xã → quận/huyện → tỉnh/thành), SĐT, size áo (S–3XL)
- [ ] Dán: AI Studio link, YouTube link, social post link, deployed link
- [ ] Chụp màn hình xác nhận nộp thành công

## Lưu ý an toàn

- Không commit bất kỳ API key thật nào vào repo (key cá nhân nằm trong phiên hoặc kho IndexedDB mã hóa)
- Trước khi nộp, thay toàn bộ ô `TODO trước khi nộp` trong `README.md` bằng link public thật
- Repo này khởi tạo với lịch sử git sạch, không mang theo lịch sử từ mdtools
