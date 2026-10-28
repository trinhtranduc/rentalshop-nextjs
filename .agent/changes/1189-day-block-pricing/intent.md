# Giá thuê theo khối ngày (block-day pricing)

Issue: #1189 · Author: Trinh Tran · Status: đã duyệt thiết kế 2026-10-25; PR 1 (API + hàm tính chung) đang mở · Created: 2026-10-24 (gộp bản "Theo mốc ngày" cũ, đã thay bằng bản này)

## Problem
Tiệm áo dài/áo cưới thuê theo gói ngày: 1 ngày 80k, 2 ngày 100k, 3 ngày 120k, thuê dài thì cộng thêm mỗi ngày. AnyRent chỉ có `FIXED` (một giá cả đơn) và `DAILY` (một giá x số ngày), nên chủ shop phải sửa giá tay từng dòng giỏ. Chủ shop đã hỏi 2026-10-20 và 2026-10-21; mục TODO "Giá thuê bậc thang theo ngày" và "Giá thuê theo khối ngày (block)" (docs/TODO.md:163,167) gộp làm một mô hình.

## Proposed outcome
- Kiểu giá thứ ba "Giá theo khối ngày", cấu hình trên **trang chi tiết sản phẩm** bằng danh sách dòng radio (Thuê theo lần / Thuê theo ngày / Giá theo khối ngày); form sản phẩm chỉ có một dòng "Giá thuê" trung tính. Bảng giá theo số ngày 1..N (tự đánh số, chỉ nhập giá) + quy tắc quá mốc cuối ("cộng thêm X/ngày" hoặc "giữ giá mốc cuối"; chủ shop chưa quyết, tạm mặc định cộng thêm).
- Một hàm tính chung cho API, web, iOS, Android; golden test cùng bảng số liệu trên cả bốn nơi.
- Tổng tiền do máy chủ tính cho dòng BLOCK khi client không khai báo `block-pricing`, nên app cũ hiện tổng đúng; app cũ không tạo/sửa được bảng giá và lưu sản phẩm bằng app cũ không làm mất bảng. Mỗi tiệm có thể chuyển sang chặn app cũ (báo cập nhật).
- Hiện đúng ở giỏ, chi tiết đơn, phiếu in, trang shop công khai (ẩn giá thì "Liên hệ").
- Kiểm tra được: 5 ngày với bảng 80/100/120 +20 = 160.000; 1 ngày với bảng bắt đầu từ 2 ngày = giá mốc đầu; lấy/trả cùng ngày VN = 1 ngày; giảm giá áp sau tổng.

## Affected users and systems
MERCHANT, OUTLET_ADMIN, OUTLET_INVENTORY (sửa giá sản phẩm; OUTLET_STAFF không sửa giá); OUTLET_STAFF tạo đơn. api, client (web), iOS, Android, packages/utils, packages/validation, packages/database, trang shop công khai, in phiếu.

## Constraints
Chỉ thêm. App cũ không cập nhật được. Server hiện tin giá client (`apps/api/app/api/orders/route.ts:802-805`), đây là nơi đầu tiên server tính lại giá; header khả năng và quy tắc giữ BLOCK đến từ PR0 hạ tầng (xem `../drafts-installments/plan.md`). Ngày VN (`timezone-dates`). Doanh thu loại đơn CANCELLED. Skill áp dụng: api-compat-review, mobile-parity, db-migration, timezone-dates, i18n-keys.

## Open questions
Xem "Chưa chốt" ở đầu spec.md.

## Decision log
- 2026-10-25 — Chủ shop: mục tiêu là cập nhật phần mềm; mockup (mc2parts.html) duyệt trước khi mở issue (owner).
- 2026-10-25 — Chủ shop duyệt thiết kế: cấu hình ở trang chi tiết bằng radio-row; cột nullable trên `ProductPricingOption` + `OrderItem.pricingSnapshot`; header `block-pricing`; phương án A mặc định, B theo từng tiệm. Quá mốc cuối còn mở. Bước cuối: gộp bản nháp vào `.agent/changes/1189-day-block-pricing/`, không mở issue mới.

## Decision log

- 2026-10-24 — Chủ shop: ưu tiên mục TODO này; mock nhập liệu trước; lấy/trả cùng ngày = 1 ngày; chưa làm giá theo giờ.
- 2026-10-25 — Chủ shop duyệt thiết kế: cấu hình ở **trang chi tiết sản phẩm** (không ở form), dòng chọn tròn thay công tắc; tên "Giá theo khối ngày" thay "Theo mốc ngày" (bản nháp cũ ghi hàng "Từ N ngày", đã bỏ: quá mốc cuối là một quy tắc riêng).
- 2026-10-25 — Dữ liệu: cột nullable trên `ProductPricingOption` + `OrderItem.pricingSnapshot`; `price` của option BLOCK = giá ngày 1. Thứ tự: #1200 (hạ tầng app cũ) → #1189 → #1199.
- 2026-10-25 — e2e app cũ thật (`.agent/changes/1199-deposit-plan/e2e-old-app-baseline.md`): iOS cũ thấy giỏ $0, Android cũ gửi 80.000 cho mọi số ngày. Hệ quả: server nhận ra dòng BLOCK theo sản phẩm (không tin payload) và trả cho app cũ một option FIXED giá ngày 1.
