# Orders: công tắc Bảng | Lịch, bỏ Lịch giao trả khỏi menu, Xuất Excel chỉ khi đã chọn đơn

Issue: #1641 · Author: Trinh Tran (with Claude) · Status: in-progress · Created: 2026-11-24

## Problem
Web shop có hai trang cho cùng một thứ: Orders (bảng) và Lịch giao trả (`/calendar`). Chúng không nối với nhau. Nút Xuất Excel luôn hiện ở tab Tất cả đơn kể cả khi chưa chọn đơn.

## Outcome
Công tắc Bảng | Lịch (có icon) trên trang Orders, luôn mở dạng Bảng; Lịch là lưới tháng + việc trong ngày tại `/orders?view=calendar`; `/calendar` cũ tự chuyển sang; mục Lịch giao trả bỏ khỏi menu; tab chỉ ở dạng Bảng; Xuất Excel chỉ hiện khi đã chọn đơn (thanh "Đã chọn n đơn" + Xuất n đơn + Bỏ chọn + "Chọn cả N đơn theo bộ lọc"). Chữ đủ 12 ngôn ngữ.

## Constraints
Chỉ web (`apps/client`, `locales`, `tests`). Không đổi API, schema, quyền xuất.

## Decisions
- 2026-11-24 chủ shop đồng ý mockup (tab "Orders (web shop): Bảng | Lịch + nút Xuất Excel" trong trang mockup chung): Lịch = số lượng theo ngày (bỏ dạng thanh thời gian thuê, vì "đồ nào đang bận" đã có Kiểm tra còn hàng); bỏ Lịch giao trả khỏi menu; luôn mở dạng Bảng, không nhớ lựa chọn; tab chỉ ở dạng Bảng; Xuất Excel chỉ khi đã chọn.
- 2026-11-24 "Chọn cả N đơn theo bộ lọc" chỉ được đưa ra khi xuất theo bộ lọc khớp danh sách: có khoảng ngày không kết thúc sau hôm nay (route từ chối ngày kết thúc ở tương lai), không có chữ tìm kiếm (route không đọc), và không quá 10.000 dòng (route chặn).
- 2026-11-24 chuyển sang Lịch khi chọn từ 2 chi nhánh: Lịch chỉ có một chi nhánh nên hiện "Tất cả chi nhánh".

## Open questions
Không.
