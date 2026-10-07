# Intent — #629 product barcode unique per shop

Status: accepted (owner, 2026-10-07: "Mã vạch chỉ cần duy nhất trong từng shop, không phải toàn hệ thống. Cần thêm một migration." → chốt)

## Problem
Adding a product fails with "Bản ghi đã tồn tại" (409 `DUPLICATE_ENTRY`) when **another shop** already uses the
barcode. `Product.barcode` has a system-wide unique index.

## Outcome (verifiable)
Two different shops can each have a product with the same barcode. Inside one shop a barcode stays unique
(same 409 `DUPLICATE_ENTRY` as today).

## Constraints
- One new Prisma migration; never edit an applied one.
- No request/response shape change; old installed apps keep working.
- Out of scope: clearing barcodes on delete, a new error code or message.
