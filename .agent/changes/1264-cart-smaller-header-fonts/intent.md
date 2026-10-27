# Giỏ hàng: chữ tên khách và thời gian thuê nhỏ hơn một bậc

Issue: #1264 · Author: Trinh Tran · Status: draft · Created: 2026-10-27

## Problem
Chủ: "ở cart có thể cho font tên khách hàng và thời gian thuê nhỏ hơn chút". Hai khối đầu giỏ đang 17 (`name`), hơi to.

## Proposed outcome
Tên khách và dòng ngày thuê dùng `body` (15) trên iOS và Android; web 15px. Mọi thứ khác giữ nguyên.

## Affected users and systems
Mọi vai trò tạo đơn; iOS, Android, client web. Không đụng API.

## Constraints
Giữ trọng lượng chữ, Dynamic Type, bố cục, dòng sản phẩm, tiền, chip. Không đổi chuỗi.

## Decision log
- 2026-10-27 — chọn `body` 15 (một bậc dưới `name` 17 trong DesignTokens, giảm 2pt) (chủ yêu cầu "chút")
