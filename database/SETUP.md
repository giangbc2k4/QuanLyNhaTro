# Hướng dẫn setup Supabase cho NhaTroPro

> Không dán key thật vào file này. Key của ứng dụng phải nằm trong `.env.local`, file này đã được Git bỏ qua.

## 1. Tạo project Supabase

1. Tạo project mới trong Supabase Dashboard.
2. Chọn region gần Việt Nam.
3. Lưu database password ở nơi an toàn.

## 2. Chạy migration

Mở **SQL Editor** và chạy lần lượt:

1. `database/migrations/0001_initial_schema.sql`
2. `database/migrations/0002_supabase_rls_and_storage.sql`
3. `database/migrations/0003_unique_account_phone.sql`

Migration sẽ tạo:

- Các bảng nghiệp vụ.
- Liên kết `accounts.id` với `auth.users.id`.
- Trigger tạo account khi đăng ký.
- Row Level Security.
- Bucket private `identity-documents`.
- Policy bảo vệ ảnh CCCD theo người dùng.

## 3. Cấu hình Authentication

Trong **Authentication → Providers**:

1. Bật Email.
2. Chọn có yêu cầu xác nhận email hay không.
3. Nếu bật xác nhận email, cấu hình **Site URL** là URL ứng dụng.
4. Với local development, thêm `http://localhost:3000` vào Redirect URLs.

## 4. Lấy URL và publishable key

Mở hộp thoại **Connect** của project hoặc **Settings → API Keys**.

Sử dụng:

- Project URL: `https://YOUR_PROJECT_REF.supabase.co`
- Publishable key: bắt đầu bằng `sb_publishable_`

Ứng dụng đăng ký/đăng nhập hiện tại không cần secret key.

## 5. Tạo `.env.local`

Tạo file `.env.local` ở thư mục gốc dự án:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

Sau khi thay đổi `.env.local`, cần khởi động lại `npm run dev`.

## 6. Kiểm tra Storage

Mở **Storage** và xác nhận:

- Có bucket `identity-documents`.
- Bucket ở chế độ private.
- Giới hạn file là 5 MB.
- Chỉ nhận JPEG, PNG và WebP.

Đường dẫn ảnh CCCD phải có dạng:

```text
{auth_user_id}/{identity_document_id}/front.jpg
{auth_user_id}/{identity_document_id}/back.jpg
```

## 7. Kiểm tra đăng ký

1. Mở `/login`.
2. Chọn **Đăng ký**.
3. Nhập họ tên, số điện thoại, email và mật khẩu tối thiểu 6 ký tự.
4. Nếu xác nhận email đang bật, mở email và xác nhận.
5. Kiểm tra user trong **Authentication → Users**.
6. Kiểm tra bản ghi tương ứng trong bảng `accounts`.

## 8. Kiểm tra đăng nhập

1. Đăng nhập bằng email và mật khẩu vừa tạo.
2. Ứng dụng chuyển tới `/dashboard`.
3. Mở tab ẩn danh và truy cập trực tiếp `/dashboard`.
4. Người chưa đăng nhập phải bị chuyển về `/login`.

## 9. Quy tắc bảo mật

- Không commit `.env.local`.
- Không đặt secret key trong biến `NEXT_PUBLIC_`.
- Không dùng secret/service-role key trong Client Component.
- Không đặt ảnh CCCD trong bucket public.
- Backend phải tạo signed URL ngắn hạn khi cần hiển thị ảnh CCCD.

## 10. Lỗi `email rate limit exceeded`

SMTP mặc định của Supabase chỉ dành cho thử nghiệm và có giới hạn gửi email thấp.

Khi gặp lỗi này:

1. Chờ quota email hồi lại rồi thử đăng ký tiếp.
2. Không bấm đăng ký liên tục bằng cùng một email.
3. Khi chuẩn bị cho người dùng thật, mở **Authentication → SMTP Settings**.
4. Cấu hình Custom SMTP bằng Resend, AWS SES, Postmark, SendGrid hoặc dịch vụ tương đương.
5. Sau khi cấu hình SMTP, kiểm tra lại giới hạn trong **Authentication → Rate Limits**.

Không nên tắt xác nhận email trong production chỉ để tránh rate limit.

## 11. Cấu hình AI đọc CCCD và bot

Ứng dụng dùng hai dịch vụ có gói miễn phí:

- Gemini: dịch vụ chính cho OCR và bot.
- Groq: dịch vụ dự phòng, hỗ trợ đọc ảnh, OCR, nhiều ảnh và JSON mode.

1. Tạo Gemini API key tại [Google AI Studio](https://aistudio.google.com/apikey).
   Nên tạo loại authorization key mới thay vì standard key cũ.
2. Tạo Groq API key tại [Groq Console](https://console.groq.com/keys).
3. Thêm các key vào `.env.local`. Có thể nhập nhiều key, cách nhau bằng dấu
   phẩy, dấu chấm phẩy, khoảng trắng hoặc xuống dòng:

```env
GEMINI_API_KEYS=gemini_key_1,gemini_key_2,gemini_key_3
GEMINI_VISION_MODEL=gemini-3.5-flash
GEMINI_TEXT_MODEL=gemini-3.5-flash

GROQ_API_KEYS=groq_key_1,groq_key_2,groq_key_3
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_TEXT_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

AI_VISION_PROVIDER_ORDER=gemini,groq
AI_TEXT_PROVIDER_ORDER=gemini,groq
```

Khi một key hết quota, bị rate limit hoặc lỗi máy chủ, ứng dụng tự thử key kế
tiếp rồi mới chuyển sang dịch vụ còn lại. OCR và bot cùng dùng lớp
`src/lib/ai/gateway.ts`, vì vậy bot sau này không cần viết lại cơ chế dự phòng.

Groq Free Plan hiện giới hạn theo phút, ngày và token. Model Llama 4 Scout có
mức cơ bản 30 request/phút và 1.000 request/ngày; hạn mức thực tế cần xem trong
trang **Limits** của tài khoản Groq.

Các key này chỉ được dùng ở server. Tuyệt đối không thêm tiền tố
`NEXT_PUBLIC_`, không commit `.env.local`, và phải khởi động lại Next.js sau
khi thay đổi biến môi trường.

## 12. Cấu hình Zalo bot đọc công tơ

Chạy tiếp migration:

```text
database/migrations/0013_invoices.sql
database/migrations/0014_zalo_meter_readings.sql
```

Thêm vào `.env.local`:

```env
# Secret key của Supabase, chỉ dùng trong webhook server.
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME

ZALO_BOT_TOKEN=REPLACE_ME
ZALO_WEBHOOK_SECRET=mot_chuoi_ngau_nhien_dai
```

Không đặt `SUPABASE_SECRET_KEY` hoặc token Zalo trong biến `NEXT_PUBLIC_`.

Sau khi deploy HTTPS, đặt webhook của Zalo OA thành:

```text
https://TEN-MIEN-CUA-BAN/api/zalo/webhook
```

Người thuê liên kết Zalo bằng tin nhắn:

```text
LIENKET 3_SO_CUOI_SDT
```

Nếu có nhiều hợp đồng trùng 3 số cuối, bot sẽ yêu cầu gửi thêm mã hợp đồng:

```text
LIENKET MA_HOP_DONG 3_SO_CUOI_SDT
```

Sau đó gửi ảnh công tơ. Bot sẽ trả lại chỉ số, lượng tiêu thụ và số tiền dự
kiến. Người gửi trả lời `OK` để xác nhận hoặc `SAI` để bỏ kết quả và gửi lại.
