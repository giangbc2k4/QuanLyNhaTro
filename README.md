# NhaTroPro

Ứng dụng quản lý nhà trọ xây dựng bằng Next.js 16 và Supabase.

Đọc [ARCHITECTURE.md](ARCHITECTURE.md) để xem sơ đồ hệ thống, luồng nghiệp vụ
và kịch bản trình bày dự án.

Đọc [CODE_EXPLANATION.md](CODE_EXPLANATION.md) để hiểu tác dụng từng khối mã
nguồn và cách giải thích khi thuyết trình.

## Chức năng chính

- Quản lý tòa nhà, phòng và dịch vụ.
- Quản lý người thuê, CCCD và hợp đồng nhiều người ở.
- Ghi nhận chỉ số điện nước, lập hóa đơn và tạo VietQR.
- Liên kết Zalo Bot để tra cứu hóa đơn và gửi ảnh công tơ.

## Chạy dự án

1. Sao chép `.env.example` thành `.env.local` và điền các biến cần thiết.
2. Cài thư viện:

   ```bash
   npm install
   ```

3. Mở Supabase SQL Editor và chạy một lần file
   [database/NHATROPRO_DATABASE.sql](database/NHATROPRO_DATABASE.sql).
4. Chạy ứng dụng:

   ```bash
   npm run dev
   ```

## Kiểm tra trước khi deploy

```bash
npm run check
npm run build
```

Toàn bộ cơ sở dữ liệu nằm trong một file duy nhất:
[database/NHATROPRO_DATABASE.sql](database/NHATROPRO_DATABASE.sql).
