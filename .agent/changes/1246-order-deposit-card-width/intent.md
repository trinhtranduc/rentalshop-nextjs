# Thẻ cọc ở chi tiết đơn rộng hai bên

Issue: #1246 · Status: draft · Created: 2026-10-27

## Problem
Thẻ "Cọc theo giai đoạn" thụt ~16pt mỗi bên và có thêm padding 14pt, nên hẹp, tên giai đoạn xuống dòng.

## Proposed outcome
Thẻ cùng lề với các hàng khác, phẳng (không viền/khung), tên giai đoạn không xuống dòng vô lý, không bị cắt "…".

## Affected users and systems
Mọi vai trò mở chi tiết đơn có cọc theo giai đoạn; iOS, Android. Web giữ nguyên.

## Constraints
Không đổi API, chuỗi, chức năng. Không sửa file giỏ hàng (#1245).

## Decision log
- 2026-10-27 — hàng phẳng, không khung, vì app dùng hàng phẳng và chủ ưa đơn giản (chủ)
