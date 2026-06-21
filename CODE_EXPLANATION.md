# Hướng dẫn đọc và giải thích mã nguồn NhaTroPro

Tài liệu này giải thích tác dụng của từng **khối mã nguồn** trong dự án, cách
các khối phối hợp với nhau và cách diễn đạt khi thuyết trình.

> Không nên giải thích từng dòng lệnh riêng lẻ. Khi trình bày, hãy giải thích
> theo luồng: dữ liệu đi vào đâu, được kiểm tra thế nào, được lưu ở đâu và giao
> diện nhận kết quả ra sao.

---

## 1. Bức tranh tổng thể

```text
Trình duyệt
   │
   ├── Landing page và trang đăng nhập
   │
   └── Dashboard
          │
          ├── Server Component đọc dữ liệu
          ├── Client Component hiển thị và giữ state
          └── Server Action ghi dữ liệu
                    │
                    ▼
             Supabase PostgreSQL
             + Auth + Storage + RLS

Zalo ──► Route Handler ──► Webhook Handler ──► AI/Supabase
VietQR ◄────────────────────────────────────── Hóa đơn
```

### Cách giải thích

> “Ứng dụng dùng Next.js cho cả giao diện và backend. Trang server đọc dữ liệu
> từ Supabase, component client xử lý tương tác, còn Server Action chịu trách
> nhiệm kiểm tra và ghi dữ liệu. Database tiếp tục bảo vệ bằng RLS và trigger.”

---

## 2. Quy ước quan trọng của Next.js

### `page.tsx`

Là điểm vào của một URL. Trong dashboard, các file này là Server Component:

- Đọc người dùng hiện tại.
- Truy vấn Supabase.
- Biến đổi dữ liệu `snake_case` của database thành dữ liệu dễ dùng cho UI.
- Truyền kết quả sang Client Component.

Ví dụ:

```text
src/app/dashboard/buildings/page.tsx
    └── đọc buildings, rooms, contracts, services
        └── tạo BuildingView và RoomView
            └── truyền vào BuildingsClient
```

### `actions.ts`

Là Server Action, chỉ chạy ở máy chủ:

- Xác thực lại người dùng.
- Kiểm tra dữ liệu đầu vào.
- Ghi dữ liệu vào Supabase.
- Làm mới trang bằng `revalidatePath`.
- Trả về `{ success, message }` cho giao diện.

### File có `"use client"`

Chạy trong trình duyệt, dùng khi cần:

- `useState`.
- Modal.
- Form.
- Nút bấm.
- Upload file.
- `localStorage`, IndexedDB hoặc `window.print()`.

### `route.ts`

Là HTTP API dành cho dịch vụ ngoài hoặc upload:

- API OCR CCCD.
- Webhook Zalo.

### `loading.tsx` và `error.tsx`

- `loading.tsx`: giao diện chờ khi route đang tải.
- `error.tsx`: Error Boundary cho lỗi không được xử lý.

---

## 3. Luồng bảo vệ dashboard

### [src/proxy.ts](src/proxy.ts)

Đây là điểm vào Proxy của Next.js 16.

```ts
export async function proxy(request: NextRequest) {
  return updateSession(request);
}
```

Khối này không chứa nghiệp vụ. Nó chuyển request sang
`src/lib/supabase/proxy.ts`.

`matcher: ["/dashboard/:path*"]` có nghĩa là Proxy chỉ chạy với dashboard.

### Cách giải thích

> “Proxy là cổng kiểm tra đầu tiên. Mọi URL trong dashboard đều phải đi qua
> đây trước khi được render.”

---

### [src/lib/supabase/proxy.ts](src/lib/supabase/proxy.ts)

#### Khối tạo Supabase server client

Client được tạo từ:

- Project URL.
- Publishable key.
- Cookie của request.

`getAll` đọc cookie hiện tại. `setAll` ghi cookie mới khi Supabase làm mới phiên.

#### Khối `getClaims`

Kiểm tra JWT trong cookie:

- Không có claims: chuyển về `/login`.
- Có claims: lấy `sub`, tức UUID người dùng.

#### Khối onboarding

Nếu đường dẫn không phải `/dashboard/settings`, hệ thống gọi
`getOwnerOnboardingState`.

- Hồ sơ chưa đủ: chuyển về Cài đặt.
- Hồ sơ đủ: cho request tiếp tục.

### Cách giải thích

> “Sau khi kiểm tra đăng nhập, Proxy kiểm tra luôn hồ sơ chủ nhà. Tài khoản mới
> chưa nhập CCCD sẽ chưa được sử dụng các phân hệ quản lý.”

---

### [src/app/dashboard/layout.tsx](src/app/dashboard/layout.tsx)

Layout xác thực lại bằng `auth.getUser()`.

Đây là lớp bảo vệ thứ hai vì không nên chỉ dựa vào Proxy.

Sau đó layout:

1. Đọc trạng thái onboarding.
2. Lấy email và tên hiển thị.
3. Bao toàn bộ trang bằng `DashboardShell`.

### Cách giải thích

> “Proxy giúp chuyển hướng sớm, nhưng layout vẫn xác thực lại trên server. Đây
> là mô hình phòng thủ nhiều lớp.”

---

### [src/components/dashboard/DashboardShell.tsx](src/components/dashboard/DashboardShell.tsx)

Client Component chứa:

- Sidebar.
- Navigation.
- Thông tin tài khoản.
- Nút đăng xuất.
- Menu mobile.

Nếu `onboardingRequired = true`, các menu khác Cài đặt bị khóa. `useEffect`
chuyển người dùng về trang Cài đặt nếu họ cố mở route khác.

### Lưu ý

Khóa menu chỉ cải thiện trải nghiệm. Bảo mật thật nằm ở server và RLS.

---

## 4. Supabase client

### [src/lib/supabase/client.ts](src/lib/supabase/client.ts)

Tạo Browser Client.

Dùng trong Client Component để:

- Đăng nhập/đăng ký.
- Đăng xuất.
- Upload ảnh vào Storage.

Chỉ dùng publishable key, không chứa secret.

---

### [src/lib/supabase/server.ts](src/lib/supabase/server.ts)

Tạo Server Client dựa trên cookie của request.

Dùng trong:

- Server Components.
- Server Actions.

File có `server-only` để ngăn import nhầm vào client bundle.

---

### [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts)

Tạo Admin Client bằng `SUPABASE_SECRET_KEY`.

Chỉ dùng trong webhook Zalo vì request từ Zalo không có cookie đăng nhập của
chủ nhà.

Admin Client:

- Không lưu session.
- Không tự refresh token.
- Có thể vượt qua RLS.

Do đó mọi truy vấn dùng admin client phải tự kiểm tra quan hệ hợp đồng, phòng
và tài khoản.

### Cách giải thích

> “Website dùng session của người dùng và RLS. Webhook Zalo là request từ hệ
> thống ngoài nên dùng secret key ở server, sau đó code tự xác định đúng hợp
> đồng được liên kết.”

---

## 5. Các helper dùng chung

### [src/lib/server/auth.ts](src/lib/server/auth.ts)

`getAuthenticatedClient()`:

1. Tạo Supabase Server Client.
2. Gọi `auth.getUser()`.
3. Trả về cả `supabase` và `user`.

Mọi Server Action dùng helper này để không lặp code xác thực.

---

### [src/lib/server/action-utils.ts](src/lib/server/action-utils.ts)

- `isUuid`: kiểm tra ID có đúng định dạng UUID.
- `cleanText`: trim chuỗi và giới hạn độ dài.

Mục tiêu:

- Không tin dữ liệu gửi từ trình duyệt.
- Tránh chuỗi quá dài.
- Tránh truy vấn bằng ID sai.

---

### [src/lib/server/action-result.ts](src/lib/server/action-result.ts)

Chuẩn hóa kết quả Server Action:

```ts
{
  success: boolean;
  message: string;
}
```

Nhờ vậy mọi giao diện có thể dùng cùng cách hiển thị thông báo.

---

### [src/lib/server/logger.ts](src/lib/server/logger.ts)

Ghi log JSON có cấu trúc:

- `logInfo`.
- `logWarning`.
- `logError`.
- `errorMessage`.

Log có cấu trúc dễ tìm kiếm trong Vercel Runtime Logs hơn chuỗi tự do.

---

### [src/lib/domain-types.ts](src/lib/domain-types.ts)

Chứa các kiểu nghiệp vụ đồng bộ với enum PostgreSQL:

- Trạng thái phòng.
- Loại tính dịch vụ.
- Trạng thái hợp đồng.
- Trạng thái hóa đơn.
- Trạng thái OCR.
- Trạng thái ảnh công tơ.

### Cách giải thích

> “Domain types tạo một ngôn ngữ chung giữa giao diện, backend và database. Nếu
> database có loại `per_person`, TypeScript cũng phải biết loại đó.”

---

### [src/lib/format.ts](src/lib/format.ts)

- `formatVND`: `4000000` thành `4.000.000đ`.
- `formatVNDShort`: `4000000` thành `4tr`.
- `formatDate`: ISO date thành ngày Việt Nam.

---

### [src/lib/use-auto-dismiss.ts](src/lib/use-auto-dismiss.ts)

Hook tự tắt thông báo sau một khoảng thời gian.

Khi có kết quả mới:

1. Tạo timer.
2. Hết thời gian thì đặt state về `null`.
3. Component unmount thì xóa timer.

---

### [src/lib/browser-draft.ts](src/lib/browser-draft.ts)

Dùng IndexedDB để giữ dữ liệu lớn như ảnh CCCD.

- `readLargeDraft`: đọc bản nháp.
- `writeLargeDraft`: lưu bản nháp.
- `deleteLargeDraft`: xóa bản nháp.

Mục đích là tránh mất ảnh nếu người dùng thoát nhầm hoặc mạng bị gián đoạn.

---

## 6. Root layout, landing page và đăng nhập

### [src/app/layout.tsx](src/app/layout.tsx)

Root Layout:

- Khai báo metadata.
- Nạp font.
- Import `globals.css`.
- Bao toàn bộ ứng dụng bằng `<html>` và `<body>`.

---

### [src/app/page.tsx](src/app/page.tsx)

Ghép các section của landing page:

- Navbar.
- Hero.
- Thống kê.
- Tính năng.
- Quy trình.
- CTA.
- Footer.

Các component nằm trong `src/components/landing`.

---

### `src/components/landing/*`

| File | Tác dụng |
|---|---|
| `Navbar.tsx` | Điều hướng đầu trang |
| `HeroSection.tsx` | Giới thiệu giá trị chính của sản phẩm |
| `StatsSection.tsx` | Hiệu ứng số liệu |
| `FeaturesGrid.tsx` | Danh sách tính năng |
| `FeatureShowcase.tsx` | Minh họa OCR, Zalo và hóa đơn |
| `HowItWorks.tsx` | Trình bày quy trình sử dụng |
| `CTASection.tsx` | Kêu gọi đăng ký |
| `Footer.tsx` | Chân trang |

---

### [src/app/login/page.tsx](src/app/login/page.tsx)

#### Khối chuẩn hóa số điện thoại

Chuyển số Việt Nam về dạng bắt đầu bằng `84` để lưu metadata nhất quán.

#### Khối dịch lỗi Auth

`getAuthErrorMessage` chuyển lỗi tiếng Anh từ Supabase thành thông báo dễ hiểu:

- Rate limit.
- Email đã đăng ký.
- Sai mật khẩu.
- Email chưa xác nhận.

#### Luồng đăng ký

1. Kiểm tra họ tên, số điện thoại, email, mật khẩu.
2. Gọi `supabase.auth.signUp`.
3. Gửi `full_name` và `phone` trong metadata.
4. Database trigger tạo `accounts`, `owner_profiles` và dịch vụ mặc định.

#### Luồng đăng nhập

1. Gọi `signInWithPassword`.
2. Thành công thì chuyển về URL `redirect` hoặc `/dashboard`.
3. Proxy và layout tiếp tục kiểm tra phiên.

---

## 7. Dashboard tổng quan

### [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)

Trang truy vấn song song:

- Phòng.
- Hợp đồng.
- Người thuê.
- Hóa đơn.
- Chỉ số công tơ.

Sau đó tính:

- Phòng đang thuê, trống, bảo trì.
- Doanh thu.
- Công nợ.
- Hợp đồng sắp hết hạn.
- Hoạt động gần đây.

`Promise.all` giúp các truy vấn độc lập chạy đồng thời.

### Cách giải thích

> “Dashboard không có bảng riêng. Nó tổng hợp dữ liệu thật từ các phân hệ để
> tạo KPI và cảnh báo.”

---

### [src/components/dashboard/DashboardDataError.tsx](src/components/dashboard/DashboardDataError.tsx)

Component lỗi dùng chung cho các trang dashboard khi Supabase query thất bại.

---

### [src/app/dashboard/loading.tsx](src/app/dashboard/loading.tsx)

Hiện biểu tượng loading trong lúc route dashboard được stream từ server.

---

### [src/app/dashboard/error.tsx](src/app/dashboard/error.tsx)

Error Boundary:

- Hiển thị lỗi ngoài dự kiến.
- Cho phép nhấn “Thử lại”.
- `reset()` yêu cầu React render lại route.

---

## 8. Nhà và phòng

### [src/app/dashboard/buildings/page.tsx](src/app/dashboard/buildings/page.tsx)

Đọc đồng thời:

- `buildings`.
- `rooms`.
- Hợp đồng đang hoạt động.
- `services`.
- `room_services`.

Trang tạo các map:

- `tenantByRoom`: phòng nào đang có ai thuê.
- `serviceIdsByRoom`: phòng đang dùng dịch vụ nào.

Trạng thái “đang thuê” không lấy từ `rooms.status`; nó được suy ra từ hợp đồng.

---

### [src/app/dashboard/buildings/actions.ts](src/app/dashboard/buildings/actions.ts)

#### `saveBuildingAction`

- Kiểm tra tên và địa chỉ.
- Tạo mới hoặc cập nhật tòa nhà.
- Chỉ thao tác dòng có `account_id` của người hiện tại.

#### `deleteBuildingAction`

- Kiểm tra UUID.
- Xóa đúng tòa nhà thuộc tài khoản.
- Database từ chối nếu còn dữ liệu không được phép xóa.

#### `saveRoomAction`

- Kiểm tra tòa nhà, giá, tầng, diện tích và trạng thái.
- Lưu phòng.
- Xóa rồi ghi lại danh sách `room_services`.

#### `deleteRoomAction`

- Xóa phòng.
- Nếu còn hợp đồng/hóa đơn tham chiếu, foreign key sẽ từ chối.

---

### [src/components/buildings/BuildingsClient.tsx](src/components/buildings/BuildingsClient.tsx)

Component điều phối:

- Chọn tòa nhà.
- Tìm phòng.
- Mở form tòa nhà/phòng.
- Mở hộp xác nhận xóa.
- Hiện dịch vụ và người đang thuê.

Các function phía cuối file là modal/form chỉ dùng trong màn hình này.

---

## 9. Dịch vụ

### [src/app/dashboard/services/page.tsx](src/app/dashboard/services/page.tsx)

Đọc:

- Danh mục dịch vụ.
- Số lần mỗi dịch vụ được gắn vào phòng.

Kết quả `roomCount` giúp giao diện cho biết dịch vụ đang được dùng ở bao nhiêu
phòng.

---

### [src/app/dashboard/services/actions.ts](src/app/dashboard/services/actions.ts)

#### `saveServiceAction`

Hỗ trợ bốn loại:

- `metered`: công tơ.
- `fixed`: cố định.
- `per_person`: theo người.
- `free`: miễn phí.

Nếu là `free`, giá luôn được ép về 0.

#### `deleteServiceAction`

Database có thể từ chối nếu dịch vụ còn được phòng hoặc hợp đồng tham chiếu.

---

### [src/components/services/ServicesClient.tsx](src/components/services/ServicesClient.tsx)

- Hiển thị danh mục dịch vụ.
- Chọn icon dựa trên tên.
- Format giá.
- Mở form thêm/sửa.
- Bật/tắt trạng thái sử dụng.

---

## 10. Người thuê và OCR CCCD

### [src/app/dashboard/tenants/page.tsx](src/app/dashboard/tenants/page.tsx)

Ghép dữ liệu từ:

- `tenants`.
- `identity_documents`.
- `contracts`.
- `contract_members`.

Trang xác định `hasContract` cho cả:

- Người thuê chính.
- Người ở cùng.

Ảnh CCCD được đổi thành signed URL có thời hạn trước khi gửi xuống client.

---

### [src/app/dashboard/tenants/actions.ts](src/app/dashboard/tenants/actions.ts)

#### `saveTenantAction`

1. Chuẩn hóa họ tên, điện thoại và CCCD.
2. Kiểm tra số điện thoại Việt Nam và CCCD 12 số.
3. Tạo/cập nhật `tenants`.
4. Tạo/cập nhật `identity_documents`.
5. Lưu đường dẫn ảnh, không lưu binary trong PostgreSQL.

#### `deleteTenantAction`

1. Kiểm tra tenant có thuộc hợp đồng hiện tại không.
2. Lấy đường dẫn ảnh.
3. Xóa tenant.
4. Xóa file Storage sau khi xóa database thành công.

Database trigger là lớp bảo vệ cuối nếu người thuê còn trong hợp đồng.

---

### [src/components/tenants/TenantsClient.tsx](src/components/tenants/TenantsClient.tsx)

#### Khối lưu tenant cùng ảnh

`saveTenantWithImages`:

1. Validate dữ liệu trước khi upload để tránh ảnh rác.
2. Upload hai mặt CCCD.
3. Gọi Server Action lưu hồ sơ.
4. Nếu ghi database thất bại, có thể xử lý dọn file theo luồng lỗi.

#### Form tenant

- Dùng cho cả tạo và sửa.
- Tích hợp `CccdUpload`.
- Lưu bản nháp.
- Tự điền thông tin OCR.

#### Tenant detail

- Hiển thị thông tin.
- Cho xem ảnh CCCD toàn màn hình.
- Khóa nút xóa khi có hợp đồng.

---

### [src/components/shared/CccdUpload.tsx](src/components/shared/CccdUpload.tsx)

#### Khối chọn ảnh

Nhận ảnh mặt trước và mặt sau, hiển thị preview.

#### Khối bản nháp

Đổi ảnh thành data URL và lưu IndexedDB bằng `browser-draft.ts`.

#### Khối OCR

1. Tạo `FormData`.
2. Gửi hai ảnh tới `/api/ai/cccd-ocr`.
3. Hiển thị các giai đoạn chuẩn bị, upload, đọc và hoàn tất.
4. Trả dữ liệu cho form cha qua `onDataExtracted`.

---

### [src/app/api/ai/cccd-ocr/route.ts](src/app/api/ai/cccd-ocr/route.ts)

API OCR:

1. Kiểm tra người dùng đã đăng nhập.
2. Đọc `front` và `back` từ `FormData`.
3. Kiểm tra MIME type và dung lượng.
4. Chuyển file thành base64.
5. Gọi `extractCccdFromImages`.
6. Trả JSON đã chuẩn hóa.

Route chạy Node.js vì cần xử lý buffer và gọi AI server-side.

---

## 11. AI Gateway

### [src/lib/ai/gateway.ts](src/lib/ai/gateway.ts)

Đây là lớp trung gian để ứng dụng không phụ thuộc cứng vào một nhà cung cấp.

#### Đọc danh sách key

`readKeys` đọc nhiều key từ biến môi trường.

#### Thứ tự provider

`readProviderOrder` đọc:

- `AI_VISION_PROVIDER_ORDER`.
- `AI_TEXT_PROVIDER_ORDER`.

#### Xoay vòng key

`rotateKeys` thay đổi key bắt đầu để không dồn toàn bộ request vào key đầu tiên.

#### `withKeyFallback`

Với từng key:

1. Gọi provider.
2. Nếu rate limit/lỗi server thì thử key tiếp theo.
3. Hết key thì chuyển provider.

#### `callGemini` và `callGroq`

Chuyển message và ảnh sang payload đúng API của từng provider.

#### Parse kết quả

- `parseCccdResult`: chuẩn hóa họ tên, CCCD, ngày sinh, địa chỉ.
- `parseMeterResult`: chuẩn hóa danh sách chỉ số công tơ.

#### Các hàm công khai

- `extractCccdFromImages`.
- `extractMeterReadingsFromImage`.
- `generateAiText`.

### Cách giải thích

> “UI không gọi Gemini trực tiếp. Mọi AI request đi qua gateway, vì vậy có thể
> đổi key và đổi provider mà không sửa các màn hình nghiệp vụ.”

---

## 12. Hợp đồng

### [src/app/dashboard/contracts/page.tsx](src/app/dashboard/contracts/page.tsx)

Đọc:

- Hợp đồng.
- Phòng.
- Người thuê.
- Hồ sơ chủ nhà.
- CCCD.
- Lịch sử chỉ số.

Trang tạo:

- `ContractView` cho danh sách và bản in.
- `RoomOption` cho form.
- `TenantOption` cho người thuê chính/người ở cùng.
- Chỉ số gợi ý gần nhất cho từng công tơ.

---

### [src/app/dashboard/contracts/actions.ts](src/app/dashboard/contracts/actions.ts)

#### Kiểm tra đầu vào

- Room và tenant phải là UUID.
- Ngày kết thúc không trước ngày bắt đầu.
- Tiền thuê/cọc không âm.
- Người thuê chính không được lặp trong danh sách ở cùng.

#### Kiểm tra nghiệp vụ

- Phòng phải thuộc tài khoản.
- Phòng không bảo trì.
- Phòng chưa có hợp đồng hoạt động.
- Người thuê chưa thuộc hợp đồng khác.
- Dịch vụ công tơ phải có chỉ số bàn giao.

#### Tạo hợp đồng

1. Tạo mã hợp đồng.
2. Insert `contracts`.
3. Trigger database chụp `room_services` sang `contract_services`.
4. Cập nhật `opening_reading`.
5. Ghi `room_meter_readings`.
6. Thêm `contract_members`.

Nếu bước sau thất bại, action dọn dữ liệu đã tạo để hạn chế bản ghi dở dang.

#### `terminateContractAction`

Chuyển trạng thái hợp đồng sang `terminated`; phòng sẽ trở thành trống vì trạng
thái thuê được suy ra từ hợp đồng.

---

### [src/components/contracts/ContractsClient.tsx](src/components/contracts/ContractsClient.tsx)

- Danh sách và lọc hợp đồng.
- Form tạo hợp đồng theo mốc 1/3/6/12 tháng.
- Chọn nhiều người ở.
- Nhập chỉ số bàn giao.
- Xem hợp đồng theo mẫu pháp lý.
- In bằng CSS print.

`PrintableContract` chỉ chịu trách nhiệm tạo nội dung bản in.

---

## 13. Hóa đơn

### [src/app/dashboard/invoices/page.tsx](src/app/dashboard/invoices/page.tsx)

Đọc:

- Hóa đơn và các khoản thu.
- Hợp đồng đang hoạt động.
- Chỉ số từ hóa đơn trước.
- Chỉ số đã xác nhận qua Zalo.
- Tài khoản ngân hàng chủ nhà.

Trang ưu tiên chỉ số mới đã xác nhận qua Zalo để gợi ý khi tạo hóa đơn.

---

### [src/app/dashboard/invoices/actions.ts](src/app/dashboard/invoices/actions.ts)

#### `createInvoiceAction`

1. Xác thực hợp đồng và tháng.
2. Kiểm tra tháng đó chưa có hóa đơn.
3. Đọc snapshot dịch vụ.
4. Tính từng loại:
   - Tiền phòng: 1 tháng.
   - Metered: `(mới - cũ) × đơn giá`.
   - Fixed: `1 × đơn giá`.
   - Per person: `số người × đơn giá`.
   - Free: 0.
5. Thêm phí phát sinh.
6. Insert `invoices`.
7. Insert `invoice_items`.

#### `createBulkInvoicesAction`

Chia hợp đồng theo nhóm nhỏ và tạo song song có giới hạn để nhanh hơn nhưng
không dồn quá nhiều request vào Supabase.

#### Các action trạng thái

- `markInvoicePaidAction`.
- `cancelInvoiceAction`.
- `deletePaidInvoiceAction` phục vụ thử nghiệm.

#### `sendInvoiceZaloAction`

1. Đọc hóa đơn.
2. Tìm liên kết Zalo.
3. Tạo VietQR.
4. Gửi ảnh QR và nội dung hóa đơn.

---

### [src/components/invoices/InvoicesClient.tsx](src/components/invoices/InvoicesClient.tsx)

- Tổng hợp đã lập/đã thu/còn nợ.
- Lọc hóa đơn.
- Tạo tay hoặc hàng loạt.
- Xem chi tiết cách tính.
- Hiện QR.
- In một hoặc nhiều hóa đơn.
- Gửi Zalo.

---

## 14. VietQR

### [src/lib/vietqr.ts](src/lib/vietqr.ts)

#### `getVietQrBanks`

Đọc danh sách ngân hàng từ VietQR API.

#### `resolveVietQrBankId`

Chuẩn hóa tên ngân hàng đã lưu và tìm BIN/short code phù hợp.

#### `invoiceTransferContent`

Tạo nội dung chuyển khoản ngắn, gắn với mã hóa đơn.

#### `vietQrImageUrl`

Tạo URL QR gồm:

- Ngân hàng.
- Số tài khoản.
- Số tiền.
- Nội dung.
- Tên chủ tài khoản.

VietQR chỉ tạo mã thanh toán; hệ thống chưa tự xác minh tiền đã vào ngân hàng.

---

## 15. Zalo Bot

### [src/app/api/zalo/webhook/route.ts](src/app/api/zalo/webhook/route.ts)

Route rất mỏng:

- Chọn Node.js runtime.
- Export GET.
- Export POST.

Logic thật được chuyển sang `webhook-handler.ts` để route dễ đọc.

---

### [src/lib/zalo/webhook-utils.ts](src/lib/zalo/webhook-utils.ts)

Chứa:

- Kiểu payload Zalo.
- Danh sách lệnh HELP.
- Xác thực webhook secret.
- Lấy message/event/image URL.
- Nhận dạng JPEG/PNG/WebP.
- Tính tháng hiện tại theo múi giờ Việt Nam.
- Chuẩn hóa lệnh không dấu.
- Parse số người dùng sửa.

---

### [src/lib/zalo/client.ts](src/lib/zalo/client.ts)

Client gửi dữ liệu về Zalo Bot API:

- `sendZaloText`.
- `sendZaloPhoto`.

Mỗi request có timeout 15 giây và kiểm tra cả HTTP status lẫn trường `ok` trong
body Zalo.

---

### [src/lib/zalo/webhook-handler.ts](src/lib/zalo/webhook-handler.ts)

#### Nhóm liên kết và tra cứu

- `linkedContract`: tìm hợp đồng đã liên kết.
- `requireLink`: trả hướng dẫn nếu chưa liên kết.
- `handleLinkCommand`: liên kết bằng ba số cuối điện thoại, có xử lý trường hợp
  trùng.
- `handleUnlinkCommand`: gỡ liên kết.
- `handleCheckCommand`: xem hợp đồng/phòng.
- `handleInvoiceCommand`: xem hóa đơn và QR.
- `handleServicesCommand`: xem dịch vụ.
- `handleReadingsCommand`: xem chỉ số gần nhất.

#### Nhóm xác nhận công tơ

- `latestPendingSubmission`: tìm kết quả gần nhất đang chờ.
- `confirmLatest`: xác nhận hoặc từ chối.
- `correctLatestReading`: thay số AI đọc bằng số người dùng gửi.

Khi xác nhận:

1. Kiểm tra dịch vụ chưa được xác nhận trong tháng.
2. Tính chỉ số cũ và mới.
3. Lưu `meter_reading_values`.
4. Ghi lịch sử `room_meter_readings`.
5. Cập nhật submission thành `confirmed`.

#### `processImage`

1. Kiểm tra liên kết Zalo.
2. Kiểm tra phòng có dịch vụ công tơ.
3. Tạo submission trạng thái `processing`.
4. Tải ảnh từ Zalo.
5. Kiểm tra loại file.
6. Upload ảnh vào Storage.
7. Gọi AI đọc ảnh.
8. Ghép kết quả AI với dịch vụ hợp đồng.
9. Chuyển sang `awaiting_confirmation`.
10. Hỏi người dùng `OK` hoặc `SAI <số đúng>`.

#### `processWebhook`

Đây là bộ định tuyến:

- Bỏ qua message từ bot hoặc group không phù hợp.
- Nhận dạng lệnh.
- Nếu có ảnh thì gọi `processImage`.
- Nếu không hiểu thì trả HELP.

#### GET handler

Dùng để:

- Kiểm tra endpoint.
- Trả challenge nếu Zalo yêu cầu.
- Kiểm tra biến môi trường khi request có secret.

#### POST handler

1. Kiểm tra webhook secret.
2. Parse payload.
3. Trả response nhận webhook nhanh.
4. Dùng `after()` để xử lý AI/database phía sau.

### Cách giải thích

> “Webhook trả lời Zalo sớm để tránh timeout, còn tác vụ nặng như tải ảnh và
> gọi AI được chạy sau response bằng `after()`.”

---

### [src/app/dashboard/zalo/page.tsx](src/app/dashboard/zalo/page.tsx)

Đọc:

- Liên kết Zalo.
- Lịch sử submission.
- Kết quả AI.
- Giá trị đã xác nhận.

Ảnh được chuyển thành signed URL 15 phút.

---

### [src/components/zalo/ZaloClient.tsx](src/components/zalo/ZaloClient.tsx)

- Hiển thị người đã liên kết.
- Lọc theo người/phòng.
- Xem lịch sử theo tháng.
- Chia hai cột điện/nước.
- Chỉ hiện bản đã xác nhận và ảnh chờ gần nhất.
- Xem ảnh toàn màn hình.
- Gỡ liên kết.

---

## 16. Cài đặt chủ nhà

### [src/app/dashboard/settings/page.tsx](src/app/dashboard/settings/page.tsx)

Đọc:

- `accounts`.
- `owner_profiles`.
- CCCD chủ nhà.
- Danh sách ngân hàng VietQR.

Sau đó xác định tài khoản còn onboarding hay không.

---

### [src/app/dashboard/settings/actions.ts](src/app/dashboard/settings/actions.ts)

#### `saveOwnerProfileAction`

- Validate hồ sơ và CCCD.
- Yêu cầu đủ hai ảnh.
- Upsert `owner_profiles`.
- Insert/update `identity_documents`.
- Làm mới dashboard và hợp đồng.

#### `saveBankSettingsAction`

- Kiểm tra ngân hàng, số tài khoản và chủ tài khoản.
- Đối chiếu ngân hàng với danh sách VietQR.
- Lưu vào `owner_profiles`.

---

### [src/components/settings/SettingsClient.tsx](src/components/settings/SettingsClient.tsx)

- Tab Hồ sơ và Ngân hàng.
- Onboarding khóa tab ngân hàng cho tới khi hồ sơ hoàn tất.
- OCR CCCD tự điền form.
- Upload ảnh Storage.
- Sau khi hoàn tất onboarding, chuyển về dashboard.

---

## 17. Database duy nhất

### [database/NHATROPRO_DATABASE.sql](database/NHATROPRO_DATABASE.sql)

File chia thành bảy phần.

### Phần 1 — Enum nghiệp vụ

Giới hạn giá trị hợp lệ:

- Trạng thái phòng/hợp đồng/hóa đơn.
- Loại dịch vụ.
- Trạng thái OCR và ảnh công tơ.

### Phần 2 — Bảng dữ liệu

17 bảng thuộc các nhóm:

1. Tài khoản và CCCD.
2. Tòa nhà, phòng và dịch vụ.
3. Hợp đồng.
4. Công tơ.
5. Hóa đơn.
6. Zalo.

### Phần 3 — Index

Index phục vụ:

- Foreign key.
- Lọc theo tài khoản/tháng/trạng thái.
- Chống trùng số điện thoại.
- Chống một phòng hoặc người có nhiều hợp đồng hoạt động.
- Một CCCD cho mỗi người.
- Một lần xác nhận công tơ mỗi tháng.

### Phần 4 — Function và trigger

Các trigger chính:

- Tự cập nhật `updated_at`.
- Chuẩn hóa số điện thoại.
- Tạo dịch vụ mặc định.
- Chụp dịch vụ vào hợp đồng.
- Chặn hợp đồng phòng bảo trì.
- Chặn người/phòng trùng hợp đồng.
- Chặn xóa người đang có hợp đồng.
- Đồng bộ `auth.users` sang bảng ứng dụng.

### Phần 5 — RLS và quyền Data API

Mỗi policy giới hạn bằng `auth.uid()`.

Các bảng quan hệ còn kiểm tra:

- Phòng thuộc tòa nhà đúng tài khoản.
- Dịch vụ thuộc phòng đúng tài khoản.
- Tenant thuộc hợp đồng đúng tài khoản.
- Hóa đơn khớp hợp đồng, phòng và tenant.

`accounts` chỉ cho client đọc; việc cập nhật được thực hiện từ Auth trigger.

### Phần 6 — Storage

Tạo hai bucket private:

- `identity-documents`.
- `meter-readings`.

Policy kiểm tra folder đầu tiên của object path bằng UUID người dùng.

### Phần 7 — Backfill Auth

Nếu project đã có `auth.users`, file tạo:

- `accounts`.
- `owner_profiles`.

### Cách giải thích

> “Tính toàn vẹn không chỉ phụ thuộc giao diện. PostgreSQL tự chặn dữ liệu sai
> bằng enum, check, unique index, foreign key, trigger và RLS.”

---

## 18. Luồng dữ liệu nên dùng khi thuyết trình

### Tạo phòng

```text
RoomFormModal
  → saveRoomAction
  → rooms
  → room_services
  → revalidatePath
  → BuildingsPage đọc lại dữ liệu
```

### Tạo người thuê bằng OCR

```text
CccdUpload
  → /api/ai/cccd-ocr
  → AI Gateway
  → tự điền form
  → upload Storage
  → saveTenantAction
  → tenants + identity_documents
```

### Tạo hợp đồng

```text
CreateContractModal
  → createContractAction
  → contracts
  → trigger snapshot dịch vụ
  → contract_services
  → room_meter_readings
  → contract_members
```

### Chốt công tơ qua Zalo

```text
Ảnh Zalo
  → webhook route
  → processImage
  → Storage
  → AI Gateway
  → hỏi xác nhận
  → meter_reading_values
```

### Tạo và gửi hóa đơn

```text
CreateInvoiceModal
  → createInvoiceAction
  → invoices + invoice_items
  → VietQR
  → sendInvoiceZaloAction
  → Zalo Bot API
```

---

## 19. Các câu hỏi phản biện thường gặp

### Tại sao cần RLS khi Server Action đã kiểm tra user?

Server Action là lớp nghiệp vụ; RLS là lớp bảo vệ cuối ngay tại database. Nếu
code server bị sai hoặc client gọi Data API trực tiếp, RLS vẫn chặn dữ liệu
khác tài khoản.

### Vì sao không lưu trạng thái `occupied` trực tiếp?

“Đang thuê” là hệ quả của hợp đồng đang hoạt động. Nếu vừa lưu trạng thái phòng
vừa lưu hợp đồng, hai nguồn có thể lệch nhau.

### Vì sao có `room_services` và `contract_services`?

`room_services` là cấu hình hiện tại. `contract_services` là điều khoản đã ký.
Thay giá chung không được làm thay đổi hợp đồng cũ.

### Vì sao AI không lưu ngay?

AI có thể đọc sai. Hệ thống hỏi người dùng xác nhận hoặc sửa trước khi tạo giá
trị chính thức.

### VietQR có tự xác nhận thanh toán không?

Không. VietQR chỉ tạo QR đúng tài khoản, số tiền và nội dung. Chủ nhà vẫn xác
nhận hóa đơn đã thanh toán.

### Vì sao Zalo webhook dùng admin key?

Webhook không có cookie đăng nhập của chủ nhà. Admin key chỉ nằm ở server; code
phải xác định hợp đồng thông qua liên kết Zalo trước khi đọc hoặc ghi dữ liệu.

---

## 20. Thứ tự mở file khi demo mã nguồn

1. `src/proxy.ts` — cổng bảo vệ dashboard.
2. `src/app/dashboard/layout.tsx` — xác thực và shell.
3. Một `page.tsx` — cách đọc dữ liệu.
4. `actions.ts` tương ứng — cách ghi dữ liệu.
5. Client Component — cách người dùng tương tác.
6. `src/lib/ai/gateway.ts` — AI fallback.
7. `src/lib/zalo/webhook-handler.ts` — Zalo và công tơ.
8. `database/NHATROPRO_DATABASE.sql` — tính toàn vẹn và RLS.

Đây là thứ tự dễ hiểu nhất vì đi từ request của người dùng xuống database rồi
mở rộng sang tích hợp bên ngoài.
