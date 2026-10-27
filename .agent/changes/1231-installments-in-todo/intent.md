# Giai đoạn cọc trong danh sách To do

Issue: #1231 · Author: Trinh Tran · Status: in-progress · Created: 2026-10-26

## Problem
Giai đoạn cọc đến hạn / trễ hạn chỉ hiện ở Tổng quan. To do (Đơn hàng iOS/Android, "Đơn hôm nay" web) không có, nhân viên dễ quên thu.

## Proposed outcome
Mỗi giai đoạn đến hạn hôm nay hoặc trễ hạn là một hàng trong To do, tính vào badge. Ngày mai thì không. Không email, không push.

## Affected users and systems
Mọi vai trò thấy To do. Web client, iOS, Android. Không đụng API.

## Constraints
Không đổi API (dùng `installmentsDue`, `installmentsOverdue` sẵn có, chỉ khi client gửi header `installments`). Client cũ không đổi. Ngày dân sự Việt Nam do API tính. Đơn giản: tái dùng hàng To do hiện có.

## Open questions
- (không)

## Decision log
- 2026-10-26 — chỉ `installmentsDue` + `installmentsOverdue` vào To do và badge; `installmentsDueTomorrow` ở lại Tổng quan (chủ).
- 2026-10-26 — web: thẻ "Cần thu hôm nay" bỏ vì cùng màn hình với To do; "Sắp đến hạn" giữ.
