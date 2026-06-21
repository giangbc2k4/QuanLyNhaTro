# NỘI DUNG THUYẾT TRÌNH DỰ ÁN NHATROPRO

> Tài liệu được tổng hợp trực tiếp từ mã nguồn trong `src/`, kiến trúc trong `ARCHITECTURE.md` và schema hợp nhất `database/NHATROPRO_DATABASE.sql`.
>
> Cách sử dụng: mỗi mục “Slide” tương ứng một trang PowerPoint. Phần “Nội dung
> trên slide” chỉ giữ ý chính; phần “Lời thuyết trình” dùng làm speaker notes,
> không chép toàn bộ lên màn hình.
>
> Với bài nói khoảng 12–15 phút, nên trình bày các slide 1–4, 6–18, 20, 22,
> 25–28. Slide 5, 19, 21, 23 và 24 có thể dùng khi demo hoặc trả lời phản biện.

---

## Slide 1. Trang bìa

### Nội dung trên slide

**NHATROPRO**

**Hệ thống quản lý nhà trọ thông minh tích hợp AI, Zalo Bot và VietQR**

- Sinh viên thực hiện: Trần Trường Giang
- Đề tài: Xây dựng hệ thống quản lý nhà trọ
- Công nghệ chính: Next.js, React, Supabase, PostgreSQL

### Lời thuyết trình

NhaTroPro là một hệ thống web hỗ trợ chủ nhà trọ quản lý tập trung tòa nhà, phòng, người thuê, hợp đồng, dịch vụ và hóa đơn. Điểm nổi bật của hệ thống là sử dụng AI để đọc CCCD và chỉ số công tơ, giao tiếp với người thuê qua Zalo Bot, đồng thời tạo mã VietQR để thanh toán hóa đơn.

### Hình ảnh đề xuất

- Logo NhaTroPro.
- Ảnh màn hình landing page hoặc dashboard.

---

## Slide 2. Lý do chọn đề tài

### Nội dung trên slide

- Nhiều chủ nhà trọ vẫn quản lý bằng sổ sách hoặc bảng tính rời rạc.
- Dễ nhầm lẫn tiền phòng, điện, nước và các khoản dịch vụ.
- Khó theo dõi phòng trống, hợp đồng sắp hết hạn và hóa đơn quá hạn.
- Việc chốt công tơ và gửi hóa đơn hàng tháng tốn nhiều thời gian.
- Dữ liệu CCCD và thông tin người thuê cần được lưu trữ an toàn.

### Lời thuyết trình

Quản lý nhà trọ gồm nhiều công việc lặp lại nhưng có liên quan chặt chẽ với nhau. Nếu dữ liệu nằm ở nhiều nơi, chủ nhà dễ nhập sai chỉ số, áp dụng sai đơn giá hoặc bỏ sót công nợ. Vì vậy, đề tài hướng đến việc số hóa toàn bộ quy trình và tự động hóa các bước tốn nhiều thời gian nhất.

---

## Slide 3. Mục tiêu của hệ thống

### Nội dung trên slide

- Quản lý toàn bộ dữ liệu nhà trọ trên một nền tảng.
- Theo dõi chính xác tình trạng sử dụng của từng phòng.
- Số hóa hồ sơ người thuê và hợp đồng.
- Tự động tính hóa đơn theo nhiều loại dịch vụ.
- Hỗ trợ AI đọc CCCD và công tơ điện, nước.
- Kết nối Zalo Bot để nhận chỉ số và gửi hóa đơn.
- Tạo mã QR thanh toán đúng số tiền và nội dung.
- Bảo vệ dữ liệu riêng của từng chủ nhà.

### Lời thuyết trình

Hệ thống không chỉ thực hiện CRUD đơn giản mà xây dựng một quy trình xuyên suốt: từ khi chủ nhà tạo phòng, thêm người thuê, lập hợp đồng, nhận chỉ số công tơ, tạo hóa đơn cho đến khi xác nhận thanh toán.

---

## Slide 4. Đối tượng sử dụng và phạm vi

### Nội dung trên slide

**Đối tượng chính**

- Chủ nhà trọ hoặc người quản lý.
- Người thuê tương tác thông qua Zalo Bot.

**Phạm vi đã triển khai**

- Quản lý nhiều tòa nhà và phòng.
- Quản lý người thuê, CCCD và người ở cùng.
- Quản lý dịch vụ, hợp đồng, chỉ số và hóa đơn.
- Dashboard thống kê.
- OCR bằng AI.
- Zalo Bot và VietQR.

### Lời thuyết trình

Giao diện web chính dành cho chủ nhà. Người thuê không cần cài thêm ứng dụng riêng mà có thể dùng Zalo để liên kết phòng, gửi ảnh công tơ, tra cứu dịch vụ, chỉ số và hóa đơn.

---

## Slide 5. Quy mô và tổ chức mã nguồn

### Nội dung trên slide

- 65 file mã nguồn TypeScript, TSX và CSS.
- Khoảng 13.074 dòng mã nguồn trong thư mục `src`.
- 1 file SQL cơ sở dữ liệu hoàn chỉnh.
- 1.025 dòng SQL.
- 17 bảng nghiệp vụ trong schema hoàn chỉnh.
- 22 chính sách Row Level Security và Storage.
- 20 trigger cơ sở dữ liệu.
- 48 index phục vụ truy vấn, khóa ngoại và ràng buộc duy nhất.
- 10 hàm PostgreSQL thực hiện đồng bộ và bảo vệ nghiệp vụ.

### Lời thuyết trình

Dự án được chia thành các lớp rõ ràng: giao diện, Server Components, Server
Actions, Route Handlers, thư viện tích hợp và cơ sở dữ liệu. Toàn bộ schema
triển khai mới nằm trong file duy nhất `database/NHATROPRO_DATABASE.sql`.

> Các con số trên được đếm từ mã nguồn sau đợt refactor ngày 22/06/2026.

---

## Slide 6. Công nghệ sử dụng

### Nội dung trên slide

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 16.2.9, React 19.2.4, TypeScript |
| Giao diện | Tailwind CSS 4, CSS tùy biến, Lucide Icons |
| Backend | Next.js Server Components, Server Actions, Route Handlers |
| Xác thực | Supabase Authentication |
| Database | PostgreSQL trên Supabase |
| Lưu trữ ảnh | Supabase Storage |
| AI | Gemini và Groq, có cơ chế dự phòng |
| Giao tiếp | Zalo Bot webhook |
| Thanh toán | VietQR |
| Triển khai | Vercel + Supabase |

### Lời thuyết trình

Next.js đảm nhiệm cả giao diện và phần xử lý phía máy chủ. Supabase cung cấp xác thực, PostgreSQL và Storage. Hai nhà cung cấp AI được đặt sau một lớp gateway chung để có thể đổi key hoặc chuyển nhà cung cấp khi gặp lỗi hoặc hết hạn mức.

---

## Slide 7. Kiến trúc tổng thể

### Nội dung trên slide

```text
Người quản lý
      |
      v
Next.js Web Application
  |-- Server Components: đọc dữ liệu
  |-- Server Actions: xử lý nghiệp vụ
  |-- API Routes: OCR và Zalo webhook
      |
      +-------------------+
      |                   |
      v                   v
Supabase              Dịch vụ ngoài
  |-- Auth              |-- Gemini/Groq AI
  |-- PostgreSQL        |-- Zalo Bot API
  |-- Storage           |-- VietQR API
  |-- RLS
```

### Lời thuyết trình

Người quản lý truy cập ứng dụng Next.js. Các trang dashboard đọc dữ liệu ở phía server. Các thao tác thêm, sửa, xóa được xử lý bằng Server Actions. OCR và webhook Zalo được triển khai bằng API Route. Mọi dữ liệu nghiệp vụ nằm trong Supabase và được bảo vệ bằng RLS.

---

## Slide 8. Các phân hệ chính

### Nội dung trên slide

1. Xác thực và hồ sơ chủ nhà.
2. Dashboard tổng quan.
3. Quản lý nhà và phòng.
4. Quản lý dịch vụ.
5. Quản lý người thuê và CCCD.
6. Quản lý hợp đồng.
7. Quản lý hóa đơn.
8. Zalo Bot và chỉ số công tơ.
9. Cấu hình ngân hàng và VietQR.

### Lời thuyết trình

Các phân hệ được thể hiện trực tiếp trong thanh điều hướng dashboard. Dữ liệu giữa các phân hệ liên kết với nhau, ví dụ phòng nhận cấu hình dịch vụ, hợp đồng nhận bản chụp dịch vụ của phòng, còn hóa đơn nhận đơn giá từ hợp đồng.

---

## Slide 9. Đăng ký, đăng nhập và hồ sơ chủ nhà

### Nội dung trên slide

- Đăng ký bằng họ tên, số điện thoại, email và mật khẩu.
- Kiểm tra định dạng số điện thoại Việt Nam.
- Supabase Auth quản lý tài khoản và phiên đăng nhập.
- Proxy bảo vệ toàn bộ đường dẫn `/dashboard`.
- Trigger tự tạo bản ghi tài khoản và hồ sơ ban đầu.
- Yêu cầu hoàn thiện hồ sơ và CCCD trước khi dùng đầy đủ hệ thống.

### Lời thuyết trình

Khi người dùng đăng ký, thông tin được gửi đến Supabase Auth. Trigger
`handle_new_auth_user` tạo hoặc cập nhật `accounts`, tạo hồ sơ chủ nhà và khởi
tạo các dịch vụ mặc định. Proxy kiểm tra phiên đăng nhập trước khi cho truy cập
dashboard. Tài khoản chưa hoàn thiện thông tin cá nhân và hai mặt CCCD sẽ được
đưa tới trang Cài đặt để hoàn tất onboarding.

---

## Slide 10. Dashboard tổng quan

### Nội dung trên slide

- Tổng số phòng.
- Số phòng đang thuê, phòng trống và phòng bảo trì.
- Tỷ lệ lấp đầy.
- Doanh thu đã thu trong tháng.
- Tổng số tiền còn phải thu.
- Cảnh báo hóa đơn quá hạn.
- Cảnh báo hợp đồng hết hạn trong 30 ngày.
- Biểu đồ doanh thu đã thu trong 6 tháng.
- Hoạt động hóa đơn và xác nhận công tơ gần đây.

### Lời thuyết trình

Dashboard không dùng dữ liệu giả cố định mà tổng hợp trực tiếp từ các bảng phòng, hợp đồng, người thuê, hóa đơn và lần đọc công tơ. Doanh thu chỉ tính những hóa đơn có trạng thái đã thanh toán.

---

## Slide 11. Quản lý nhà và phòng

### Nội dung trên slide

- Thêm, sửa, xóa nhiều tòa nhà.
- Quản lý số phòng, tầng, diện tích và giá thuê.
- Hai trạng thái vận hành được nhập thủ công: sẵn sàng và bảo trì.
- Trạng thái “đang thuê” được suy ra từ hợp đồng đang hiệu lực.
- Gán danh sách dịch vụ riêng cho từng phòng.
- Không cho xóa phòng đang được hợp đồng sử dụng.
- Không cho lập hợp đồng với phòng đang bảo trì.

### Lời thuyết trình

Một điểm thiết kế quan trọng là không lưu “đang thuê” như trạng thái chỉnh tay. Hệ thống dựa vào hợp đồng `active` hoặc `expiring` để xác định phòng đang có người thuê. Cách này tránh tình trạng phòng hiển thị trống trong khi vẫn có hợp đồng.

---

## Slide 12. Quản lý dịch vụ

### Nội dung trên slide

**Bốn cách tính phí**

- `metered`: tính theo chỉ số công tơ.
- `fixed`: phí cố định theo kỳ.
- `per_person`: đơn giá nhân số người ở.
- `free`: tiện ích miễn phí.

**Ví dụ**

- Điện: kWh.
- Nước: m³.
- Máy giặt, vệ sinh: theo tháng.
- Nước theo người: người/tháng.
- Điều hòa, nóng lạnh: miễn phí.

### Lời thuyết trình

Mỗi tài khoản có bảng giá dịch vụ riêng. Khi tạo tài khoản, hệ thống tự khởi tạo một số dịch vụ mặc định. Chủ nhà có thể chỉnh đơn giá, loại tính phí, trạng thái hoạt động và gán dịch vụ cho từng phòng.

---

## Slide 13. Quản lý người thuê và OCR CCCD

### Nội dung trên slide

- Lưu thông tin cá nhân, liên hệ, nghề nghiệp và liên hệ khẩn cấp.
- Lưu thông tin CCCD tách khỏi hồ sơ người thuê.
- Tải ảnh mặt trước và mặt sau CCCD.
- AI đề xuất họ tên, số CCCD, ngày sinh, giới tính, quê quán, địa chỉ và thông tin cấp.
- Người dùng kiểm tra và chỉnh lại trước khi lưu.
- Ảnh được lưu trong bucket private.
- Khi hiển thị, hệ thống tạo signed URL có thời hạn 15 phút.
- Không cho xóa người đang tham gia hợp đồng còn hiệu lực.

### Lời thuyết trình

API OCR chỉ nhận JPEG, PNG hoặc WebP và giới hạn mỗi ảnh ở 1,4 MB. Kết quả AI
chỉ là dữ liệu đề xuất; người dùng vẫn là người kiểm tra cuối cùng. Khi xóa một
người thuê không còn bị hợp đồng ràng buộc, hệ thống cũng xóa ảnh CCCD tương
ứng khỏi Storage.

---

## Slide 14. Quản lý hợp đồng

### Nội dung trên slide

- Chọn phòng, người thuê chính và người ở cùng.
- Chọn ngày bắt đầu, ngày kết thúc, tiền phòng và tiền cọc.
- Nhập chỉ số điện, nước bàn giao.
- Sinh mã hợp đồng tự động.
- In hợp đồng với thông tin hai bên.
- Theo dõi trạng thái: nháp, hiệu lực, sắp hết hạn, hết hạn, kết thúc.
- Không cho một người tham gia đồng thời nhiều hợp đồng đang hiệu lực.

### Lời thuyết trình

Khi hợp đồng được tạo, trigger sao chép danh sách dịch vụ của phòng sang `contract_services`. Đây là bản chụp đơn giá tại thời điểm ký. Sau này chủ nhà thay đổi bảng giá chung cũng không làm thay đổi hợp đồng cũ.

### Điểm nghiệp vụ nổi bật

- Phòng bảo trì bị chặn ở cả lớp ứng dụng và trigger database.
- Chỉ số bàn giao được lưu trong hợp đồng và bảng lịch sử chỉ số.
- Người ở cùng được lưu trong `contract_members`.

---

## Slide 15. Quản lý hóa đơn

### Nội dung trên slide

- Tạo hóa đơn cho từng hợp đồng hoặc tạo hàng loạt.
- Tự lấy tiền phòng và dịch vụ từ hợp đồng.
- Tự tính theo bốn loại dịch vụ.
- Hỗ trợ khoản phí phát sinh.
- Theo dõi: chưa thanh toán, quá hạn, đã thanh toán, đã hủy.
- In một hóa đơn hoặc nhiều hóa đơn.
- Xác nhận đã thanh toán.
- Gửi hóa đơn kèm QR qua Zalo.

### Công thức chính

```text
Dịch vụ công tơ:
Số lượng = Chỉ số mới - Chỉ số cũ
Thành tiền = Số lượng × Đơn giá

Dịch vụ theo người:
Thành tiền = Số người trong hợp đồng × Đơn giá

Tổng hóa đơn:
Tiền phòng + Tổng dịch vụ + Phí phát sinh
```

### Lời thuyết trình

Chỉ số cũ được ưu tiên lấy từ hóa đơn gần nhất. Nếu chưa có hóa đơn, hệ thống dùng chỉ số bàn giao đầu hợp đồng hoặc lịch sử chỉ số AI đã được xác nhận. Hệ thống từ chối chỉ số mới nhỏ hơn chỉ số cũ.

---

## Slide 16. Quy trình Zalo Bot đọc công tơ

### Nội dung trên slide

```text
Người thuê gửi LIENKET
        ↓
Bot xác minh hợp đồng và 3 số cuối điện thoại
        ↓
Người thuê gửi ảnh công tơ
        ↓
AI nhận dạng loại công tơ và chỉ số
        ↓
Bot gửi kết quả dự kiến
        ↓
Người thuê trả lời OK hoặc SAI <số đúng>
        ↓
Chỉ số được xác nhận và lưu vào hệ thống
```

### Các lệnh đã triển khai

- `LIENKET <3 số cuối SĐT>`
- `LIENKET <mã hợp đồng> <3 số cuối SĐT>`
- `CHECK` hoặc `KIEMTRA`
- `HOADON`
- `DICHVU`
- `CHISO`
- `GUIANH`
- `HUYLIENKET`
- `HELP`
- `OK`
- `SAI <số đúng>`

### Lời thuyết trình

AI không tự động ghi nhận ngay. Kết quả ban đầu ở trạng thái chờ xác nhận.
Người thuê phải trả lời `OK` hoặc sửa bằng `SAI <số đúng>`. Hệ thống giới hạn
mỗi dịch vụ công tơ trong một hợp đồng chỉ có một giá trị được xác nhận cho mỗi
tháng. Webhook xác thực secret, phản hồi yêu cầu sớm rồi mới xử lý tác vụ nặng
ở nền để giảm nguy cơ Zalo chờ quá lâu và gửi lại sự kiện.

---

## Slide 17. Cơ chế AI và khả năng dự phòng

### Nội dung trên slide

- Một lớp `AI Gateway` dùng chung cho OCR CCCD, công tơ và sinh văn bản.
- Hỗ trợ Gemini và Groq.
- Cho phép cấu hình thứ tự nhà cung cấp.
- Hỗ trợ nhiều API key cho mỗi nhà cung cấp.
- Tự chuyển key khi lỗi xác thực, hết quota, rate limit hoặc lỗi máy chủ.
- Nếu một nhà cung cấp thất bại, thử nhà cung cấp tiếp theo.
- Chuẩn hóa kết quả về JSON có cấu trúc.

### Lời thuyết trình

Thiết kế gateway giúp phần còn lại của hệ thống không phụ thuộc trực tiếp vào một nhà cung cấp AI. Đây là cách giảm rủi ro gián đoạn khi một key hết hạn mức hoặc dịch vụ tạm thời gặp lỗi.

---

## Slide 18. VietQR và thanh toán

### Nội dung trên slide

- Chủ nhà cấu hình ngân hàng, số tài khoản và tên chủ tài khoản.
- Hệ thống lấy danh sách ngân hàng từ VietQR.
- QR chứa sẵn:
  - Ngân hàng nhận.
  - Số tài khoản.
  - Số tiền hóa đơn.
  - Nội dung chuyển khoản theo mã hóa đơn.
- QR được hiển thị trong chi tiết hóa đơn và gửi qua Zalo.

### Lời thuyết trình

Người thuê chỉ cần quét mã QR, không phải nhập lại số tiền hay nội dung. Việc
gắn mã hóa đơn vào nội dung chuyển khoản giúp chủ nhà dễ đối chiếu. Tuy nhiên,
VietQR trong phiên bản hiện tại chỉ tạo thông tin thanh toán; hệ thống chưa tự
biết tiền đã thực sự vào tài khoản ngân hàng.

---

## Slide 19. Thiết kế cơ sở dữ liệu

### Nội dung trên slide

**Nhóm tài khoản và định danh**

- `accounts`
- `owner_profiles`
- `tenants`
- `identity_documents`

**Nhóm tài sản và hợp đồng**

- `buildings`
- `rooms`
- `services`
- `room_services`
- `contracts`
- `contract_members`
- `contract_services`
- `room_meter_readings`

**Nhóm hóa đơn và Zalo**

- `invoices`
- `invoice_items`
- `zalo_room_links`
- `meter_reading_submissions`
- `meter_reading_values`

### Quan hệ rút gọn

```text
accounts
 ├── owner_profiles
 ├── tenants ── identity_documents
 ├── buildings ── rooms ── room_services
 ├── contracts ── contract_members
 │            └── contract_services
 ├── invoices ── invoice_items
 └── zalo_room_links ── meter_reading_submissions
                       └── meter_reading_values
```

### Lời thuyết trình

Hầu hết bảng nghiệp vụ đều có `account_id` để xác định chủ sở hữu dữ liệu. Khóa ngoại và quy tắc xóa được lựa chọn theo nghiệp vụ: dữ liệu phụ thuộc có thể cascade, nhưng phòng hoặc người thuê đang được hợp đồng tham chiếu sẽ bị hạn chế xóa.

---

## Slide 20. Bảo mật dữ liệu

### Nội dung trên slide

- Supabase Auth quản lý đăng nhập.
- Proxy bảo vệ các trang dashboard.
- Server Action kiểm tra người dùng trước mỗi thao tác.
- RLS giới hạn dữ liệu theo `auth.uid()`.
- Policy kiểm tra cả quan hệ chéo, không cho gắn tenant hoặc CCCD của tài khoản khác.
- Bảng `accounts` chỉ đọc đối với client và được đồng bộ bằng trigger từ Auth.
- Bucket CCCD và ảnh công tơ ở chế độ private.
- Ảnh CCCD chỉ mở bằng signed URL ngắn hạn.
- Secret Supabase, Zalo và AI chỉ dùng phía server.
- Không đưa secret vào biến `NEXT_PUBLIC_*`.
- Webhook Zalo kiểm tra secret trước khi xử lý.
- Database trigger bảo vệ các quy tắc nghiệp vụ quan trọng.

### Lời thuyết trình

Bảo mật được thực hiện nhiều lớp. Nếu giao diện hoặc Server Action có lỗi, RLS vẫn là lớp cuối tại database để ngăn tài khoản này truy cập dữ liệu của tài khoản khác.

---

## Slide 21. Các ràng buộc nghiệp vụ tiêu biểu

### Nội dung trên slide

- Mỗi số điện thoại chủ tài khoản chỉ đăng ký một lần sau khi chuẩn hóa.
- Số phòng không trùng trong cùng một tòa nhà.
- Tên dịch vụ không trùng trong cùng tài khoản.
- Không tạo hợp đồng cho phòng bảo trì.
- Không xóa người thuê đang có hợp đồng.
- Chỉ số mới không được nhỏ hơn chỉ số cũ.
- Mỗi dịch vụ chỉ xác nhận một lần đọc trong một tháng.
- Tháng hóa đơn luôn là ngày đầu tháng.
- Đơn giá và số tiền không được âm.
- CCCD thuộc đúng một loại chủ sở hữu: chủ nhà hoặc người thuê.
- Mỗi chủ nhà và mỗi người thuê chỉ có tối đa một hồ sơ CCCD.
- Một phòng chỉ có tối đa một hợp đồng đang hoạt động.
- Một người thuê, dù là người thuê chính hay người ở cùng, chỉ tham gia tối đa
  một hợp đồng đang hoạt động.

### Lời thuyết trình

Các ràng buộc không chỉ nằm trên giao diện mà còn được đưa xuống PostgreSQL bằng enum, check constraint, unique index, foreign key và trigger. Điều này tăng tính toàn vẹn của dữ liệu.

---

## Slide 22. Luồng nghiệp vụ hoàn chỉnh

### Nội dung trên slide

```text
Đăng ký tài khoản
      ↓
Hoàn thiện hồ sơ chủ nhà và ngân hàng
      ↓
Tạo tòa nhà, phòng và bảng giá dịch vụ
      ↓
Thêm người thuê bằng OCR CCCD
      ↓
Tạo hợp đồng + chỉ số bàn giao
      ↓
Người thuê liên kết Zalo và gửi ảnh công tơ
      ↓
AI đọc → người thuê xác nhận
      ↓
Chủ nhà tạo hóa đơn
      ↓
Gửi hóa đơn + VietQR qua Zalo
      ↓
Chủ nhà xác nhận đã thanh toán
      ↓
Dashboard cập nhật doanh thu và công nợ
```

### Lời thuyết trình

Đây là điểm cốt lõi của NhaTroPro: các chức năng không đứng độc lập mà tạo thành một chuỗi nghiệp vụ liên tục từ lúc tiếp nhận người thuê đến khi thu tiền hàng tháng.

---

## Slide 23. Chuẩn bị dữ liệu demo

### Nội dung trên slide

- Tạo trước một tài khoản chủ nhà hoàn chỉnh.
- Chuẩn bị ít nhất hai tòa nhà và nhiều trạng thái phòng.
- Có người thuê chính và người ở cùng.
- Có hợp đồng đang hoạt động và hợp đồng sắp hết hạn.
- Có chỉ số điện nước đã xác nhận.
- Có hóa đơn đã thanh toán và chưa thanh toán.
- Liên kết sẵn một tài khoản Zalo với phòng demo hoặc chuẩn bị thao tác liên kết
  trực tiếp.

### Lời thuyết trình

Dữ liệu demo nên được tạo qua đúng giao diện và luồng nghiệp vụ của hệ thống.
Trước buổi trình bày cần kiểm tra lại webhook Zalo, API key AI, ảnh mẫu, hóa đơn
và cấu hình ngân hàng để tránh phụ thuộc vào mạng hoặc dịch vụ bên ngoài.

---

## Slide 24. Kịch bản demo trực tiếp

### Nội dung trên slide

1. Đăng nhập vào hệ thống.
2. Mở Dashboard và giới thiệu số liệu.
3. Mở Nhà & Phòng, xem phòng đang thuê và bảo trì.
4. Mở Người thuê, xem hồ sơ và ảnh CCCD.
5. Tạo thử một người thuê bằng OCR.
6. Mở Hợp đồng và in hợp đồng demo.
7. Mở Zalo Bot, xem lịch sử AI đọc công tơ.
8. Mở Hóa đơn, xem cách tính tiền.
9. Hiển thị VietQR hoặc gửi hóa đơn qua Zalo.
10. Xác nhận hóa đơn đã thanh toán và quay lại Dashboard.

### Lời thuyết trình

Khi demo nên đi theo đúng luồng nghiệp vụ thay vì mở ngẫu nhiên từng trang. Nếu thời gian ngắn, tập trung vào ba điểm nổi bật: OCR CCCD, Zalo đọc công tơ và hóa đơn kèm VietQR.

---

## Slide 25. Kết quả đạt được

### Nội dung trên slide

- Xây dựng được ứng dụng web quản lý nhà trọ tương đối đầy đủ.
- Dữ liệu các phân hệ liên kết nhất quán.
- Tự động hóa chốt chỉ số và lập hóa đơn.
- Hỗ trợ nhiều kiểu tính dịch vụ thực tế.
- Tích hợp AI có cơ chế dự phòng.
- Tích hợp kênh Zalo quen thuộc với người dùng Việt Nam.
- Tăng bảo mật bằng Auth, RLS, Storage private và trigger.
- Có một file database hoàn chỉnh để triển khai Supabase mới.

### Lời thuyết trình

Kết quả quan trọng nhất là hệ thống đã hình thành được quy trình khép kín. Không chỉ quản lý thông tin, ứng dụng còn hỗ trợ vận hành hàng tháng và giảm thao tác thủ công cho chủ nhà.

---

## Slide 26. Hạn chế hiện tại

### Nội dung trên slide

- Chưa tích hợp đối soát giao dịch ngân hàng tự động.
- Thanh toán vẫn cần chủ nhà xác nhận thủ công.
- Chưa có vai trò nhân viên quản lý hoặc phân quyền chi tiết.
- Chưa có cổng riêng đầy đủ cho người thuê ngoài Zalo.
- AI vẫn phụ thuộc chất lượng ảnh và hạn mức nhà cung cấp.
- Chưa có hệ thống kiểm thử tự động đầy đủ.
- Một số số liệu quảng bá trên landing page là nội dung giao diện cố định, chưa phải số liệu vận hành thực tế.
- Chưa có đối soát tự động để xác nhận giao dịch VietQR đã thành công.

### Lời thuyết trình

Khi trình bày, nên phân biệt rõ tính năng đã triển khai với định hướng sản phẩm. Ví dụ các con số như “500+ chủ nhà”, “5.000+ phòng” hay “99,9% uptime” trên landing page hiện chỉ là nội dung marketing mẫu, chưa có hệ thống đo lường trong code.

---

## Slide 27. Hướng phát triển

### Nội dung trên slide

- Tích hợp webhook ngân hàng để tự động đối soát thanh toán.
- Thêm vai trò chủ nhà, nhân viên, kế toán và người thuê.
- Xây dựng cổng người thuê và thông báo đa kênh.
- Tự động nhắc nợ và nhắc hợp đồng sắp hết hạn.
- Xuất báo cáo Excel, PDF và báo cáo thu chi.
- Bổ sung quản lý chi phí sửa chữa và lợi nhuận.
- Thêm kiểm thử unit, integration và end-to-end.
- Theo dõi log, lỗi, hiệu năng và chi phí AI.
- Mã hóa hoặc che bớt dữ liệu CCCD khi không cần hiển thị đầy đủ.

### Lời thuyết trình

Hướng phát triển ưu tiên là hoàn thiện thanh toán tự động và phân quyền nhiều vai trò. Sau đó có thể mở rộng sang báo cáo tài chính và ứng dụng dành cho người thuê.

---

## Slide 28. Kết luận

### Nội dung trên slide

**NhaTroPro = Quản lý tập trung + Tự động hóa + AI + Kênh giao tiếp quen thuộc**

- Giảm thao tác thủ công.
- Hạn chế sai sót khi tính tiền.
- Theo dõi phòng, hợp đồng và công nợ rõ ràng.
- Tăng trải nghiệm cho cả chủ nhà và người thuê.
- Có nền tảng kỹ thuật để tiếp tục mở rộng thành sản phẩm thực tế.

### Lời thuyết trình

NhaTroPro cho thấy khả năng kết hợp giữa phát triển web hiện đại, cơ sở dữ liệu có ràng buộc nghiệp vụ, AI thị giác và nền tảng giao tiếp phổ biến tại Việt Nam để giải quyết một bài toán thực tế.

---

# PHẦN PHỤ LỤC DÙNG KHI TRẢ LỜI PHẢN BIỆN

## 1. Vì sao chọn Next.js?

Next.js cho phép xây dựng giao diện và backend trong cùng một dự án. Server Components phù hợp để đọc dữ liệu an toàn ở phía server; Server Actions giúp xử lý form và nghiệp vụ; Route Handlers phù hợp cho OCR API và webhook Zalo.

## 2. Vì sao chọn Supabase?

Supabase cung cấp đồng thời PostgreSQL, Authentication và Storage. Quan trọng hơn, PostgreSQL hỗ trợ RLS, trigger, constraint và transaction, phù hợp với dữ liệu hợp đồng và hóa đơn cần tính toàn vẹn cao.

## 3. Vì sao cần RLS nếu Server Action đã kiểm tra người dùng?

Kiểm tra ở Server Action là lớp bảo vệ ứng dụng. RLS là lớp bảo vệ tại database. Nếu một truy vấn bị viết sai hoặc client cố truy cập trực tiếp API dữ liệu, RLS vẫn giới hạn bản ghi theo `auth.uid()`.

## 4. Vì sao dịch vụ phải được sao chép vào hợp đồng?

Nếu hợp đồng chỉ tham chiếu bảng giá hiện tại, việc chủ nhà tăng giá điện hoặc nước sẽ làm các hợp đồng cũ thay đổi theo. `contract_services` lưu bản chụp tên, đơn vị, loại tính và đơn giá đúng tại thời điểm ký.

## 5. Vì sao trạng thái đang thuê không lưu trực tiếp trong phòng?

Nếu vừa lưu trạng thái phòng vừa lưu hợp đồng, hai nguồn dữ liệu có thể mâu thuẫn. Hệ thống chỉ lưu trạng thái vận hành là sẵn sàng hoặc bảo trì, còn đang thuê được suy ra từ hợp đồng đang hiệu lực.

## 6. Làm sao hạn chế AI đọc sai công tơ?

- Prompt yêu cầu chỉ đọc ô số chính, không đọc số sê-ri.
- AI trả về loại công tơ, chỉ số và độ tin cậy.
- Hệ thống kiểm tra chỉ số mới không nhỏ hơn chỉ số cũ.
- Kết quả chưa được lưu ngay.
- Người thuê phải trả lời `OK` hoặc sửa bằng `SAI <số đúng>`.

## 7. Nếu Gemini hết quota thì sao?

Gateway hỗ trợ nhiều key cho Gemini và Groq. Khi gặp lỗi 401, 403, 429 hoặc lỗi máy chủ, hệ thống thử key khác. Nếu nhà cung cấp thứ nhất thất bại, hệ thống chuyển sang nhà cung cấp tiếp theo theo cấu hình.

## 8. Dữ liệu CCCD được bảo vệ thế nào?

- Metadata được lưu trong bảng có RLS.
- Ảnh nằm trong bucket private.
- Đường dẫn ảnh theo tài khoản người dùng.
- Client không nhận secret key.
- Khi xem ảnh, server tạo signed URL chỉ có hiệu lực 15 phút.

## 9. Hóa đơn được tính như thế nào?

Tiền phòng lấy từ hợp đồng. Dịch vụ cố định nhân một lần; dịch vụ theo người nhân số cư dân; dịch vụ miễn phí bằng 0; dịch vụ công tơ dùng hiệu giữa chỉ số mới và chỉ số cũ rồi nhân đơn giá. Cuối cùng cộng thêm phí phát sinh nếu có.

## 10. Zalo liên kết đúng phòng bằng cách nào?

Người thuê gửi ba số cuối điện thoại. Server tìm hợp đồng đang hiệu lực có số điện thoại phù hợp. Nếu có nhiều kết quả trùng, bot yêu cầu thêm mã hợp đồng. Liên kết được lưu duy nhất theo hợp đồng và theo Zalo user trong phạm vi tài khoản.

## 11. Hệ thống có chống nhập trùng hóa đơn tháng không?

Có. Phần ứng dụng lọc những hợp đồng đã có hóa đơn trong tháng và bỏ qua khi
tạo hàng loạt. Ở tầng database, unique index
`invoices_current_contract_month_uidx` tiếp tục bảo đảm mỗi hợp đồng chỉ có một
hóa đơn chưa bị hủy trong một tháng. Như vậy quy tắc được bảo vệ ở cả giao diện
lẫn PostgreSQL.

## 12. Điểm kỹ thuật nổi bật nhất là gì?

Ba điểm nổi bật:

1. Chuỗi nghiệp vụ liên kết từ phòng đến hợp đồng, công tơ và hóa đơn.
2. AI có bước xác nhận của con người và cơ chế dự phòng nhiều nhà cung cấp.
3. Bảo mật đa tầng bằng Auth, Server Actions, RLS, Storage private và trigger.

---

# DANH SÁCH FILE QUAN TRỌNG ĐỂ TRÍCH DẪN KHI THUYẾT TRÌNH

| Nội dung | File tiêu biểu |
|---|---|
| Landing page | `src/app/page.tsx`, `src/components/landing/*` |
| Đăng ký, đăng nhập | `src/app/login/page.tsx` |
| Bảo vệ phiên đăng nhập | `src/proxy.ts`, `src/lib/supabase/proxy.ts` |
| Dashboard | `src/app/dashboard/page.tsx` |
| Nhà và phòng | `src/app/dashboard/buildings/*`, `src/components/buildings/BuildingsClient.tsx` |
| Dịch vụ | `src/app/dashboard/services/*`, `src/components/services/ServicesClient.tsx` |
| Người thuê | `src/app/dashboard/tenants/*`, `src/components/tenants/TenantsClient.tsx` |
| OCR CCCD | `src/components/shared/CccdUpload.tsx`, `src/app/api/ai/cccd-ocr/route.ts` |
| Hợp đồng | `src/app/dashboard/contracts/*`, `src/components/contracts/ContractsClient.tsx` |
| Hóa đơn | `src/app/dashboard/invoices/*`, `src/components/invoices/InvoicesClient.tsx` |
| Zalo Bot | `src/app/api/zalo/webhook/route.ts`, `src/components/zalo/ZaloClient.tsx` |
| AI Gateway | `src/lib/ai/gateway.ts` |
| VietQR | `src/lib/vietqr.ts` |
| Database hoàn chỉnh | `database/NHATROPRO_DATABASE.sql` |

---

# GỢI Ý THIẾT KẾ POWERPOINT

- Tỷ lệ: 16:9.
- Màu nền: xanh đen `#060B18`.
- Màu nhấn: xanh dương, tím và xanh ngọc giống giao diện dự án.
- Font tiêu đề: Outfit hoặc Be Vietnam Pro.
- Font nội dung: Inter.
- Mỗi slide chỉ giữ 4–6 ý chính; phần dài chuyển vào speaker notes.
- Dùng ảnh chụp thật của Dashboard, Nhà & Phòng, Hợp đồng, Hóa đơn và Zalo.
- Dùng sơ đồ ERD trong `anhquantrong/erd-nhatropro.png`.
- Dùng sơ đồ UML trong `anhquantrong/uml-nhatropro.png`.
- Với phần demo, chuẩn bị sẵn một tài khoản đã có dữ liệu ở tất cả phân hệ.

---

# LƯU Ý ĐỂ TRÌNH BÀY CHÍNH XÁC

- Không khẳng định tỷ lệ OCR “99%” nếu chưa có bộ dữ liệu kiểm thử và báo cáo đo lường.
- Không dùng các số “500+ chủ nhà”, “5.000+ phòng”, “90% tiết kiệm thời gian” hoặc “99,9% uptime” như kết quả thực tế; đây đang là nội dung cố định trên landing page.
- VietQR tạo mã thanh toán nhưng chưa tự xác nhận tiền đã về ngân hàng.
- Zalo Bot đã có luồng liên kết, tra cứu, nhận ảnh và gửi hóa đơn; hiệu quả thực tế phụ thuộc token, webhook và cấu hình OA.
- Khi trình bày bảo mật, nhấn mạnh bucket private và RLS, nhưng cũng thừa nhận dữ liệu CCCD cần tiếp tục được kiểm toán và gia cố nếu triển khai production quy mô lớn.
