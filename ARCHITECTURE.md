# Kiến trúc NhaTroPro

Tài liệu này là bản đồ nhanh dành cho người mới đọc mã nguồn và dùng để trình
bày kiến trúc hệ thống.

## 1. Hệ thống giải quyết bài toán gì?

NhaTroPro giúp một chủ nhà quản lý toàn bộ vòng đời cho thuê:

```text
Tài khoản chủ nhà
  → Tòa nhà và phòng
  → Người thuê và CCCD
  → Hợp đồng và dịch vụ
  → Chỉ số điện nước
  → Hóa đơn và VietQR
  → Tra cứu, gửi ảnh qua Zalo Bot
```

Mỗi chủ nhà là một `account`. Mọi bảng nghiệp vụ đều gắn với `account_id`, vì
vậy hai chủ nhà có thể quản lý những người thuê có cùng số điện thoại hoặc CCCD
mà dữ liệu vẫn tách biệt.

## 2. Công nghệ chính

- **Next.js 16 App Router**: giao diện, Server Components, Server Actions và API.
- **React 19**: các màn hình tương tác.
- **Supabase Auth**: đăng ký, đăng nhập và phiên người dùng.
- **Supabase PostgreSQL**: dữ liệu nghiệp vụ, trigger và RLS.
- **Supabase Storage**: ảnh CCCD và ảnh công tơ.
- **Gemini/Groq**: OCR CCCD và đọc ảnh công tơ, có cơ chế đổi key/provider.
- **Zalo Bot**: liên kết phòng, tra cứu và gửi ảnh chỉ số.
- **VietQR**: sinh QR thanh toán hóa đơn.

## 3. Cấu trúc mã nguồn

```text
src/
├── app/
│   ├── dashboard/           # Các trang quản trị và Server Actions
│   ├── api/                 # OCR API và Zalo webhook
│   ├── login/               # Đăng ký, đăng nhập
│   └── page.tsx             # Landing page
├── components/
│   ├── buildings/           # UI tòa nhà và phòng
│   ├── contracts/           # UI hợp đồng
│   ├── invoices/            # UI hóa đơn
│   ├── services/            # UI dịch vụ
│   ├── settings/            # Hồ sơ chủ nhà và ngân hàng
│   ├── tenants/             # UI người thuê và CCCD
│   ├── zalo/                # UI quản lý liên kết Zalo
│   └── shared/              # Thành phần dùng chung
└── lib/
    ├── ai/                  # Gateway AI và cơ chế dự phòng
    ├── server/              # Helper chỉ được chạy trên server
    ├── supabase/            # Supabase client cho browser/server/admin
    ├── zalo/                # Zalo API, webhook và tiện ích
    ├── domain-types.ts      # Kiểu nghiệp vụ đồng bộ với enum PostgreSQL
    ├── format.ts            # Định dạng tiền và ngày
    └── vietqr.ts            # Danh sách ngân hàng và URL VietQR
```

## 4. Quy tắc phân chia code

- `page.tsx` là **Server Component**: đọc dữ liệu gần database và biến đổi thành
  dữ liệu hiển thị.
- File `actions.ts` là **Server Actions**: xác thực lại người dùng, kiểm tra đầu
  vào, ghi dữ liệu và gọi `revalidatePath`.
- Component có `"use client"` chỉ giữ state giao diện, modal và thao tác người
  dùng.
- Route API chỉ nhận/trả HTTP. Logic Zalo nằm trong `src/lib/zalo`.
- Secret key chỉ xuất hiện trong module server; không dùng tiền tố
  `NEXT_PUBLIC_`.

## 5. Luồng đăng nhập và onboarding

1. Supabase Auth xác thực email/mật khẩu.
2. Trigger `handle_new_auth_user` tạo `accounts`, `owner_profiles` và dịch vụ
   mặc định.
3. `src/proxy.ts` bảo vệ toàn bộ `/dashboard`.
4. Tài khoản chưa đủ hồ sơ và hai ảnh CCCD bị chuyển tới phần Cài đặt.
5. Server Component và Server Action vẫn xác thực lại, không chỉ dựa vào proxy.

## 6. Luồng hợp đồng

1. Chọn phòng sẵn sàng, người thuê chính và người ở cùng.
2. Nhập chỉ số bàn giao cho dịch vụ tính theo công tơ.
3. Database chặn phòng bảo trì, phòng đã có hợp đồng và người đang ở hợp đồng
   khác.
4. Trigger chụp dịch vụ từ `room_services` sang `contract_services`.
5. Giá dịch vụ trong hợp đồng không đổi khi bảng giá chung được sửa sau này.

## 7. Luồng công tơ và hóa đơn

```text
Ảnh Zalo
  → AI đọc chỉ số
  → Người thuê xác nhận hoặc sửa
  → meter_reading_values
  → Tạo invoice_items
  → Tổng hóa đơn
  → VietQR
```

- Mỗi dịch vụ công tơ chỉ được xác nhận một lần trong một tháng.
- Điện/nước công tơ tính bằng `chỉ số mới - chỉ số cũ`.
- Dịch vụ `per_person` tính theo số người trong hợp đồng.
- Dịch vụ `fixed` tính một lần mỗi tháng; `free` có giá bằng 0.

## 8. Bảo mật dữ liệu

- Tất cả bảng `public` đều bật Row Level Security.
- Policy giới hạn dữ liệu bằng `account_id = auth.uid()`.
- Ảnh CCCD nằm trong bucket private `identity-documents`.
- Ảnh công tơ nằm trong bucket private `meter-readings`.
- UI chỉ nhận signed URL có thời hạn.
- Zalo webhook dùng Supabase secret key ở server và kiểm tra webhook secret.

## 9. Database

Toàn bộ enum, bảng, index, trigger, RLS và Storage được đặt trong một file:

```text
database/NHATROPRO_DATABASE.sql
```

Tạo Supabase project mới, mở SQL Editor và chạy toàn bộ file đúng một lần.

## 10. Kịch bản demo đề xuất

1. Đăng nhập và giới thiệu dashboard.
2. Mở Nhà và phòng để giải thích trạng thái phòng suy ra từ hợp đồng.
3. Mở Người thuê và xem ảnh CCCD/OCR.
4. Tạo hợp đồng, chọn nhiều người ở và nhập chỉ số bàn giao.
5. Xem dịch vụ được chụp vào hợp đồng.
6. Mở Zalo Bot, gửi ảnh công tơ và xác nhận chỉ số.
7. Tạo hóa đơn, mở QR và gửi hóa đơn qua Zalo.
8. Kết thúc bằng RLS: mỗi chủ nhà chỉ nhìn thấy dữ liệu của mình.
