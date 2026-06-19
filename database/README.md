# Cơ sở dữ liệu NhaTroPro

Thư mục này lưu thiết kế và migration của cơ sở dữ liệu PostgreSQL.

## Cấu trúc

- `migrations/`: các thay đổi schema, chạy theo thứ tự tên file.
- `schema.md`: mô tả mô hình dữ liệu và quan hệ nghiệp vụ.
- `SETUP.md`: hướng dẫn từng bước setup PostgreSQL, Supabase và nơi lưu ảnh CCCD.

## Quy ước

- ID sử dụng UUID.
- Thời gian lưu dưới dạng `timestamptz`.
- Tiền lưu bằng `bigint`, đơn vị đồng Việt Nam.
- Ảnh CCCD chỉ lưu đường dẫn tới object storage, không lưu dữ liệu ảnh trực tiếp trong PostgreSQL.
- Số CCCD là dữ liệu nhạy cảm; backend phải phân quyền và không trả toàn bộ số cho client nếu không cần thiết.

## Migration hiện tại

1. `migrations/0001_initial_schema.sql`
   - Tài khoản chủ nhà
   - Hồ sơ và thông tin CCCD
   - Tòa nhà
   - Phòng
   - Người thuê
   - Hợp đồng
   - Thành viên ở cùng
2. `migrations/0002_supabase_rls_and_storage.sql`
   - Row Level Security theo tài khoản Supabase Auth
   - Bucket private `identity-documents`
   - Storage policy cho ảnh CCCD
3. `migrations/0003_unique_account_phone.sql`
   - Chuẩn hóa số điện thoại Việt Nam
   - Không cho phép hai tài khoản dùng chung một số điện thoại
4. `migrations/0004_services_and_room_services.sql`
   - Bảng giá dịch vụ theo tài khoản
   - Dịch vụ mặc định theo phòng
5. `migrations/0005_add_free_service_billing_type.sql`
   - Thêm loại dịch vụ miễn phí
6. `migrations/0006_update_default_services.sql`
   - Cập nhật giá mặc định và tiện ích miễn phí
7. `migrations/0007_contract_service_snapshots.sql`
   - Lưu bản chụp dịch vụ và đơn giá vào từng hợp đồng
8. `migrations/0008_derive_room_occupancy_from_contracts.sql`
   - Trạng thái đang thuê được suy ra từ hợp đồng
   - Phòng chỉ cho phép chỉnh sẵn sàng hoặc bảo trì
9. `migrations/0009_block_contracts_for_maintenance_rooms.sql`
   - Chặn tạo hoặc kích hoạt hợp đồng cho phòng đang bảo trì

## Các phần tiếp theo

- Chỉ số điện nước
- Hóa đơn và chi tiết hóa đơn
- Thanh toán VietQR
- Zalo Bot và lịch sử tin nhắn
- Nhật ký OCR và đối chiếu CCCD
- Phân quyền truy cập dữ liệu
