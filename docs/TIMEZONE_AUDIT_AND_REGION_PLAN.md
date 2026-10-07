# Múi giờ: kết quả audit, kế hoạch sửa và hỗ trợ nhiều region

Cập nhật: 2026-10-06 · Issue: [#578](https://github.com/trinhtranduc/rentalshop-nextjs/issues/578) (sửa lỗi audit), [#567](https://github.com/trinhtranduc/rentalshop-nextjs/issues/567) (nhiều region)

Audit tìm ra khoảng 66 chỗ chia ngày sai múi giờ. Mình sẽ sửa trong 6 PR nhỏ, mỗi PR có test viết trước. Không đổi dữ liệu, không đổi dạng API, chạy trên dev trước và chỉ lên production khi chủ shop cho phép.

Chi tiết từng lỗi (file:dòng, tình huống, hướng sửa, test): `.agent/changes/578-timezone-audit-fixes/audit.md`.
Spec và plan: `.agent/changes/578-timezone-audit-fixes/{intent,spec,plan}.md` và `.agent/changes/567-shop-timezone/`.

---

## 1. Quy tắc nền

- Database lưu **thời điểm UTC**.
- Một **ngày** là ngày dân sự của shop, hiện là Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7), viết dạng `YYYY-MM-DD`.
- Ngày D theo giờ Việt Nam = `[D-1 17:00Z, D 17:00Z)`. Ví dụ ngày 10/10 = `2026-10-09T17:00:00Z` → `2026-10-10T16:59:59.999Z`.
- Thuê và trả cùng ngày vẫn chiếm ngày đó và tính 1 ngày.
- Giờ của máy (điện thoại, trình duyệt, server) **không** dùng để chia ngày. Giờ máy chỉ dùng để hiển thị giờ phút (14:30).

## 2. Kết quả audit (2026-10-06, origin/dev, chỉ đọc code)

| Khu vực | Số lỗi | Nặng nhất | Bị ảnh hưởng khi |
|---|---|---|---|
| API | 18 | Còn hàng có thể cho thuê trùng (API-1), báo trùng lịch sai (API-2) | **Luôn luôn**, mọi shop |
| Package dùng chung (`utils`, `database`, `ui`, `hooks`, `loyalty`) | 9 | `date-range.ts` chia ngày theo UTC: gốc của lỗi Excel và báo cáo | Luôn luôn |
| Web admin | 9 | Form gói dịch vụ lệch 7 giờ mỗi lần lưu; gia hạn mất hoặc thừa ngày | Luôn luôn (admin) |
| Web shop | 4 | Excel không khớp danh sách; mở tab qua đêm "hôm nay" không đổi | Luôn luôn, nhẹ |
| iOS | 9 | Tạo, sửa, gia hạn đơn lấy ngày theo giờ máy | Điện thoại không đặt giờ Việt Nam |
| Android | 9 | Như iOS | Điện thoại không đặt giờ Việt Nam |

Ví dụ lỗi đang xảy ra với shop Việt Nam:
- Đơn trả lúc 05:00 ngày 10/10 không được tính khi kiểm tra còn hàng ngày 10/10, nên sản phẩm hiện **còn** dù đang bị giữ.
- Đơn tạo lúc 03:00 giờ Việt Nam bị tính vào ngày hôm trước trong Excel, xếp hạng, tăng trưởng và doanh thu hôm nay trên mobile.
- Overview cộng cả đơn huỷ vào doanh thu ở một khối, trong khi khối khác không cộng.
- "Quá hạn" có 3 định nghĩa khác nhau giữa các API.
- Gia hạn gói từ 31/1 cộng 1 tháng ra 3/3.

## 3. Cách giữ hệ thống đang chạy không bị ảnh hưởng

1. **Không đụng production.** Agent không chạy lệnh production, migration, seed hay reset ngoài database local. Hook `.claude/hooks/production-gate.sh` chặn những lệnh này. Lên `main-real` chỉ qua `release-review`, khi chủ shop cho phép.
2. **Dev trước.** Mỗi PR merge vào `dev`, chạy trên dev-api, kiểm tra xong mới tính chuyện release.
3. **Không đổi dạng API, app cũ vẫn chạy.** Request và response giữ nguyên. API vẫn nhận mọi định dạng app cũ đang gửi:
   - ngày `YYYY-MM-DD`;
   - thời điểm ISO;
   - khoảng `T00:00Z…T23:59:59Z` của iOS cũ;
   - ngày trả 23:59Z của Android cũ;
   - tham số `timeZone` tuỳ chọn.

   Mỗi PR có bảng tương thích (`api-compat-review`).
4. **Không sửa dữ liệu cũ.** Không đổi schema (trừ cột thêm mới của #567), không migration dữ liệu, không ghi lại đơn đã có.
5. **Số liệu thay đổi đều là sửa lỗi, và được liệt kê trước–sau** trên database seed trong từng PR.
6. **Test viết trước** (`bug-fix-tdd`). Mỗi lỗi có test ở ranh giới 16:59:59Z / 17:00:00Z, chạy với cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`. Ngoài ra mỗi PR chạy toàn bộ Jest, `scripts/e2e/business-e2e.sh`, test end-to-end về ngày, lint, type-check và build.
7. **PR nhỏ, revert riêng được.** Mỗi đợt một PR, không trộn với nhau.
8. **Mobile:** tạm giữ múi giờ Việt Nam cố định. Điện thoại đặt giờ Việt Nam gửi request y hệt bản hiện tại. Thay đổi chỉ có hiệu lực ở bản build mới.

**Agent không làm:** deploy production, đụng database production, nộp app lên store, sửa lại đơn cũ.

## 4. Sáu đợt sửa (theo thứ tự)

| # | Đợt | Nội dung | File chính | Kiểm tra thêm |
|---|---|---|---|---|
| 1 | **A. Còn hàng** | Sửa lỗi có thể cho thuê trùng và báo trùng lịch sai | `products/availability/route.ts`, `products/batch-availability/route.ts`, `apps/api/lib/availability*.ts` | Gửi lại đúng request của iOS/Android cũ; Tạo đơn trên web và giỏ hàng mobile ở stack local |
| 2 | **B. Báo cáo theo ngày** (sau #567 phase 1) | `date-range.ts` chia theo ngày Việt Nam; Excel (khoảng ngày và giờ trong ô); xếp hạng; tăng trưởng; overview (bỏ đơn huỷ); doanh thu hôm nay; tổng tiền đơn của khách; một định nghĩa "quá hạn" | `packages/utils/src/core/date-range.ts`, `excel.ts`, các route analytics và export, `packages/database/src/order.ts` | Số liệu trước–sau theo từng route; tổng = tổng các dòng trong danh sách |
| 3 | **D. Web shop** | "Hôm nay" tự đổi qua nửa đêm; Sửa đơn giữ nguyên giờ giao/trả; "hết hạn N ngày trước" đếm theo ngày | `apps/client/app/**` | Test trình duyệt có tua đồng hồ |
| 4 | **C. Admin** | Form gói dịch vụ; gia hạn; bộ lọc và preset; chọn ngày khi tạo đơn hộ; định dạng ngày | `apps/admin/**`, `packages/ui` (bộ lọc, picker, form gói), `packages/hooks/useProductAvailability`, formatter ngày | Admin mở bằng trình duyệt ở UTC và Los Angeles |
| 5 | **E. Gói dịch vụ, email, cron** | Cộng tháng không tràn; số ngày còn lại theo ngày; email in ngày Việt Nam; reset loyalty theo ngày Việt Nam | route và helper gói dịch vụ, `email.ts`, `packages/loyalty/src/expiry.ts` | Chủ shop chốt quy tắc cộng tháng; không chạy cron trên production |
| 6 | **F. iOS và Android** | Tạo, sửa, gia hạn đơn; bộ lọc; hôm nay; trễ hạn; nhóm theo ngày; nhãn; lịch và tổng quan gửi `timeZone=Asia/Ho_Chi_Minh` | iOS: `RCExtentions`, `DesignTokens`, Cart, RentalExtension, OrdersHome… · Android: `OrderPlanDays`, CartStore, RentalExtension, repository và view model | XCTest và JUnit với điện thoại ở Tokyo, Los Angeles, UTC; build; `mobile-e2e-local` |

Rollback: đợt 1–5 revert PR; đợt 6 ra bản build tiếp theo, API không bị ảnh hưởng.

## 5. Hỗ trợ nhiều region (#567)

### Đã chốt

- Múi giờ gắn với **shop**, không gắn với chi nhánh hay thiết bị.
- Đợt này "region" **chỉ là múi giờ**. Tiền tệ và ngôn ngữ vẫn là setting riêng.
- Shop cũ giữ `Asia/Ho_Chi_Minh`. **Shop mới lấy múi giờ của máy lúc đăng ký** (máy ở Việt Nam → UTC+7). App cũ đăng ký mà không gửi múi giờ thì shop nhận `Asia/Ho_Chi_Minh`.
- Chủ shop đổi được trong Cài đặt → Thông tin cửa hàng.
- Với người dùng thuộc một shop, server luôn dùng múi giờ shop. App cũ gửi giờ máy hay giờ Việt Nam cố định cũng không làm lệch ngày.

### Mỗi việc dùng múi giờ nào

| Việc | Múi giờ |
|---|---|
| Đăng ký shop mới | Máy gửi múi giờ hệ thống **một lần**; server lưu làm múi giờ shop |
| Chọn ngày thuê "08/10" rồi gửi lên | Đầu ngày 08/10 theo **múi giờ shop**, đổi sang UTC. Shop ở Việt Nam → `2026-10-07T17:00:00Z` |
| Ngày `YYYY-MM-DD` gửi lên (lọc, lịch, còn hàng) | **Múi giờ shop** |
| "Hôm nay", trễ hạn, doanh thu theo ngày, lịch | **Múi giờ shop**, giống nhau trên mọi máy |
| Hiển thị giờ phút ("tạo lúc 14:30") | Múi giờ **hệ thống** của máy |
| Database | **UTC** |

Ví dụ vì sao không chia ngày theo giờ máy: chủ shop Hà Nội đang ở Tokyo và tạo đơn nhận ngày 08/10. Nếu chia theo giờ máy, đơn bắt đầu từ 22:00 ngày 07/10 giờ Việt Nam, và nhân viên ở Hà Nội thấy đơn lệch một ngày.

### Năm phase

| Phase | Nội dung | Ảnh hưởng hành vi |
|---|---|---|
| 1. Nền tảng (đang làm) | Thêm cột `Merchant.timezone` (mặc định `Asia/Ho_Chi_Minh`); helper nhận múi giờ tuỳ chọn; login và profile trả `merchant.timezone`; Cài đặt nhận `timezone`; đăng ký nhận múi giờ của máy | Không |
| 2. API | Mọi logic theo ngày dùng múi giờ shop; sửa luôn các lỗi của đợt B | Shop Việt Nam: chỉ phần sửa lỗi |
| 3. Web | `useShopTimeZone()`; ô chọn "Múi giờ" trong Cài đặt; đăng ký gửi múi giờ trình duyệt | Shop Việt Nam: không |
| 4. Mobile | Đọc `merchant.timezone`; đổi giá trị cố định của đợt F thành múi giờ shop; đăng ký gửi múi giờ máy | Shop Việt Nam: không |
| 5. Tài liệu | Skill `timezone-dates` đổi từ "ngày Việt Nam" sang "ngày của shop"; eval mới; ghi chú release | — |

## 6. Câu hỏi cần chủ shop chốt

- [ ] **Đợt E:** gia hạn từ 31/1 cộng 1 tháng ra **28/2 (29/2 năm nhuận)** đúng không? Hiện ra 3/3.
- [ ] **#567 Q1:** shop đổi múi giờ khi nhân viên còn dùng app cũ. Đề xuất: vẫn cho đổi, kèm cảnh báo trong Cài đặt và một cờ app-config để bản mới nhắc cập nhật.
- [ ] **#567 Q2:** đơn đã có giữ thời điểm UTC, nên nhãn ngày đổi theo múi giờ mới. Đề xuất: chấp nhận, và ghi việc đổi múi giờ vào lịch sử shop.
- [ ] **#567 Q3:** ô chọn múi giờ: danh sách ngắn (VN, TH, SG, MY, ID, PH, JP, KR, AU, US, UK, EU) kèm ô tìm toàn bộ?

## 7. Liên kết

- Issue sửa lỗi audit: [#578](https://github.com/trinhtranduc/rentalshop-nextjs/issues/578), folder `.agent/changes/578-timezone-audit-fixes/`
- Issue nhiều region: [#567](https://github.com/trinhtranduc/rentalshop-nextjs/issues/567), folder `.agent/changes/567-shop-timezone/` (nhánh `feat/567-shop-timezone`)
- Quy tắc hiện hành: `.claude/skills/timezone-dates/SKILL.md`, eval `.agent/evals/cases/vn-civil-day.md`, `355-analytics-vn-day.md`
- Test end-to-end về ngày (đang viết): `scripts/e2e/web-e2e.sh`, `tests/e2e/business/`
