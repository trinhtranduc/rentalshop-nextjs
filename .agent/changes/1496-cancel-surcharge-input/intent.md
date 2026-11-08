# Sheet hủy đơn có ô Phụ thu rõ ràng

Issue: #1496 · Author: Trinh Tran · Status: accepted · Created: 2026-11-08

## Problem

Sheet hủy đơn (#1491, dùng lại của #1199) hiện "Khách đã trả", "Tiệm giữ lại" và "Hoàn cho khách" là số xanh trơn, không có khung nhập và
không có chữ "Phụ thu". Chủ shop (tài khoản `MERCHANT`) hủy đơn #441589 (thuê, Đã đặt, cọc 40, tổng 68) trên điện thoại nhưng không nhận ra
chỗ nhập: log máy chỉ có `{"status":"CANCELLED"}`, đơn hủy hoàn hết cọc.

## Proposed outcome

iOS, Android, web: nhãn "Phụ thu" ("Surcharge") thay "Tiệm giữ lại"; ô nhập có khung rõ, chữ mờ "0", tự lấy focus (bàn phím số) với vai trò được nhập;
"Hoàn cho khách" là dòng chỉ đọc tính từ phụ thu; ghi chú: phụ thu là phần tiệm giữ lại trong tiền cọc.

## Affected users and systems

Chủ shop và quản lý chi nhánh (nhập); nhân viên thấy ô khóa kèm gợi ý. iOS `CancelDepositOrderSheet`, Android `CancelDepositOrderSheet`, web `CancelWithKeptDialog`
và các nhãn dùng chung (khối kết quả đơn đã hủy). API không đổi.

## Constraints

Không đổi quy tắc tiền (phụ thu từ 0 đến tiền cọc; chỉ chủ shop và quản lý nhập). Đơn cọc theo đợt dùng chung sheet nên cũng đổi nhãn và kiểu ô. Chuỗi mới có en và vi.

## Open questions

- Có cần cho nhân viên nhập phụ thu không? Đã chốt giữ như cũ (chỉ chủ shop và quản lý).

## Decision log

- 2026-11-08 — Đổi nhãn, khung nhập, tự lấy focus, hoàn khách chỉ đọc (Trinh Tran: "có").
