# Web: vai trò khác chủ shop xem ghi chú in ở dạng chỉ đọc

Issue: #1332 · Status: accepted · Created: 2026-10-31

## Problem

Trên web, nhân viên và nhân viên kho không thấy ghi chú in, chỉ thấy công tắc QR bị khoá. Quản lý chi nhánh vẫn sửa được và chữ còn ghi "Chỉ chủ cửa hàng hoặc quản lý chi nhánh được đổi".

## Proposed outcome

Chỉ MERCHANT sửa ghi chú in và QR trên web. Vai trò khác thấy ghi chú ở ô chỉ đọc kèm câu giải thích như app.

## Affected users and systems

OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY trên `apps/client`. Không đổi API.

## Constraints

Không đổi API. Chuỗi mới có đủ en, vi, ja, ko, zh.

## Decision log

- 2026-10-31 — Chủ shop chốt: chỉ MERCHANT sửa ghi chú in và QR, vai trò khác chỉ xem. API còn cho OUTLET_ADMIN ghi `printNote`, `printBankQr`; siết API không thuộc issue này.
