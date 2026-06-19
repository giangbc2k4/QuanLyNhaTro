# Mô hình dữ liệu ban đầu

## Quan hệ chính

```text
auth.users
  └── accounts

accounts
  ├── owner_profiles
  └── account_preferences
       └── identity_documents

accounts
  └── buildings
       └── rooms
            └── contracts

accounts
  └── tenants
       ├── identity_documents
       └── contracts
            └── contract_members
```

## Thực thể

### accounts

Hồ sơ ứng dụng liên kết 1-1 với Supabase Auth qua:

```text
accounts.id = auth.users.id
```

Mỗi tài khoản chỉ được truy cập dữ liệu có cùng `account_id`. RLS sử dụng `auth.uid()` để thực thi giới hạn này ở tầng PostgreSQL.

### owner_profiles

Hồ sơ cá nhân của chủ nhà/chủ tài khoản.

### account_preferences

Tùy chọn thông báo riêng của từng tài khoản. Thông tin ngân hàng thuộc
`owner_profiles` vì đây là thông tin nhận thanh toán của chủ nhà.

### identity_documents

Thông tin CCCD của chủ tài khoản hoặc người thuê:

- Số CCCD
- Họ tên
- Ngày sinh
- Giới tính
- Quê quán
- Địa chỉ thường trú
- Ngày cấp
- Ảnh mặt trước và mặt sau
- Trạng thái OCR và đối chiếu

### buildings và rooms

Một tài khoản có nhiều tòa nhà; mỗi tòa nhà có nhiều phòng.

### tenants

Thông tin liên lạc và hồ sơ của người thuê. CCCD được tách riêng để dễ phân quyền dữ liệu nhạy cảm.

### contracts

Gắn người thuê chính với một phòng trong một khoảng thời gian.

Hợp đồng không thể được tạo hoặc kích hoạt nếu phòng đang ở trạng thái bảo trì. Chủ nhà phải chuyển phòng về trạng thái sẵn sàng cho thuê trước.

### contract_members

Những người ở cùng trong hợp đồng. Một người đã có hồ sơ tenant có thể được liên kết bằng `tenant_id`; người chưa có hồ sơ vẫn có thể lưu thông tin cơ bản.

### services, room_services và contract_services

- `services`: bảng giá dịch vụ riêng của từng tài khoản.
- `room_services`: cấu hình những dịch vụ mặc định đang áp dụng cho từng phòng.
- `contract_services`: bản chụp dịch vụ đã thỏa thuận khi tạo hợp đồng.

Khi tạo hợp đồng, các dịch vụ của phòng được sao chép sang `contract_services`, bao gồm tên, đơn vị, loại tính và đơn giá. Thay đổi bảng giá hoặc dịch vụ của phòng sau này không tự làm thay đổi hợp đồng đã ký.
