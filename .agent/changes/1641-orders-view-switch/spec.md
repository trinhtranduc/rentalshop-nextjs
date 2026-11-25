# Spec — Orders Bảng | Lịch, Xuất Excel khi đã chọn

Issue: #1641 · Status: in-progress · Intent: ./intent.md

## Behavior
1. `/orders` mở dạng Bảng. `/orders?view=calendar` mở dạng Lịch (lưới tháng, danh sách việc trong ngày, chọn chi nhánh). Giá trị `view` khác `calendar` là Bảng.
2. Công tắc Bảng | Lịch (icon bảng và lịch) nằm cạnh tiêu đề "Đơn hàng" ở cả hai dạng; không nhớ lựa chọn lần trước.
3. Đổi dạng mang theo một chi nhánh (`outlet=5` hoặc `outlets=5`); từ 2 chi nhánh trở lên thành "Tất cả chi nhánh" ở Lịch; bộ lọc, tháng, ngày, trang không mang theo. Lịch về Bảng: `outlet=5` thành `outlets=5`.
4. Dạng Lịch không có tab Việc cần làm / Tất cả đơn / Chưa lấy đồ và không có nút xuất.
5. `/calendar?month=11&year=2026&day=2026-11-24&outlet=5` chuyển sang `/orders?view=calendar&month=11&year=2026&day=2026-11-24&outlet=5` (chỉ giữ month, year, day, outlet).
6. Menu trái không còn "Lịch giao trả".
7. Tab Tất cả đơn: chưa chọn đơn thì không có nút xuất nào. Chọn ≥ 1 đơn thì hiện thanh "Đã chọn n đơn" với **Xuất n đơn** (xuất đúng các đơn đã chọn) và **Bỏ chọn**. Quyền xuất `useCanExportData` giữ nguyên.
8. Thanh chọn có "Chọn cả N đơn theo bộ lọc" khi đã chọn một phần, và xuất theo bộ lọc khớp danh sách (mục Intent/Decisions). Thanh đổi thành "Đã chọn cả N đơn theo bộ lọc" và nút "Xuất Excel (N đơn)". Tick hoặc bỏ tick một dòng, đổi bộ lọc hoặc tìm kiếm thì thoát chế độ này.
9. Các tab khác (Việc cần làm, Chưa lấy đồ) không có thanh chọn.

## Out of scope
Dạng Lịch kiểu thanh theo thời gian thuê; nhớ dạng xem; đổi route xuất; ô chọn chi nhánh dùng chung một kiểu ở hai dạng (việc sau).

## API and data
Không đổi.

## Acceptance
- [x] Mỗi dòng có test (`tests/web-orders-view-model.test.ts`, `tests/web-shell-nav.test.ts`) hoặc kiểm tra trên web thật (plan)
- [x] iOS và Android: không bị ảnh hưởng
- [x] Chữ mới đủ 12 ngôn ngữ (`locales-complete`, `locales-valid-json`)
