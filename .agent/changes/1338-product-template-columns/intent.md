# Ẩn Pricing Type và Duration Config khỏi file Excel mẫu sản phẩm

Issue: #1338 · Author: Trinh Tran · Status: in-progress · Created: 2026-10-30

## Problem

File mẫu "Tải file mẫu sản phẩm" có hai cột kỹ thuật `Pricing Type (FIXED/HOURLY/DAILY)` và `Duration Config (JSON string)` (`packages/utils/src/import/sample-generator.ts:93-94`). Chủ shop không muốn khách thấy hai cột này.

## Proposed outcome

File mẫu có 9 cột: `Name, Description, Barcode, Category Name, Rent Price, Sale Price, Cost Price, Deposit, Stock`. File cũ 11 cột vẫn nhập được như hôm nay.

## Affected users and systems

Mọi vai trò dùng trang nhập sản phẩm (web `apps/client`). Route `GET /api/import/sample/products`. Không có iOS/Android gọi.

## Constraints

- Không đổi khả năng nhận file: validator, route `bulk-import`, `mapHeaders` giữ nguyên.
- Chỉ bớt cột của file mẫu, không bớt field JSON nào.
- Đơn giản: không thêm UI, không đổi locales.

## Open questions

- Không.

## Decision log

- 2026-10-30 — Chỉ sửa file mẫu; không sửa `ImportInstructions.tsx` (component không được dùng ở đâu). (chủ shop yêu cầu giữ đơn giản)
