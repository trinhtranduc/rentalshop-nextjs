# Spec — #562 Xem trước hóa đơn redone on the shop web

Issue: #562 · Status: accepted · Intent: ./intent.md

## Behavior

1. Dialog: shell tokens, portal under `<body>` with `.ar-theme` (dark tokens apply). Title
   "Hoá đơn #<orderNumber>". Body: the slip on a white paper card (white in dark mode too), centred on a
   muted backdrop. Footer: **Đóng** (outline) and **In** (primary, printer icon). Esc and backdrop close.
   Below 640px the dialog is full screen with the footer at the bottom.
2. **In** calls `window.print()`. Print CSS (only while the dialog is open): `@page { size: 80mm auto; margin: 0 }`,
   every `<body>` child except the receipt portal is hidden, the dialog chrome is hidden, the slip prints
   80mm wide, black on white. Same paper width as the old iframe print.
3. Slip content, in the iOS `Order.toPrintData` order:
   1. Shop name (upper case), phone, address. Name: order outlet → `outlet` prop → `outletName` → merchant.
      Phone / address: order outlet → `outlet` prop → the caller's outlet list (fetched when the order has no
      outlet details, e.g. right after Tạo đơn) → merchant.
   2. "Đơn hàng #694224".
   3. "Khách hàng: <name> – <phone>" (no customer → "Khách lẻ").
   4. RENT: Tiền cọc (0 → "Không cọc"), Thế chân (if > 0), Giấy tờ thế chân (type label · details, if any),
      Phí hư hại (if > 0), Ngày thuê, Ngày trả (Vietnam civil day dd/MM/yyyy), Ngày tạo (Vietnam time
      dd/MM/yyyy HH:mm). SALE: Ngày tạo only.
   5. Items: "1. <name> (<note>)" then right-aligned calc:
      DAILY rent → `q × <unit>/ngày × <d> ngày = <total>` (d = `rentalDays`, else total ÷ (q × unit), min 1);
      HOURLY rent → `q × <unit>/giờ × <h> giờ = <total>` when total ≠ q × unit;
      otherwise `q × <unit> = <total>`. Name: `productName` snapshot → `product.name`.
   6. Order note: "Ghi chú: <notes>" when not blank.
   7. Tạm tính (sum of item totals; no items → total + discounts), Giảm giá (percentage → "Giảm giá (10%)"; 0 → 0đ),
      Giảm giá điểm thưởng (if > 0), Tổng cộng (`totalAmount`, already after discounts, #352).
   8. RENT: the outlet print note (#347: order outlet → `outlet` prop; blank → none; SALE never), then
      signatures "Chữ ký khách hàng" / "Chữ ký cửa hàng" with room to sign.
   9. "Cảm ơn quý khách!", "Tải AnyRent trên App Store".
4. Money: `2.600.000đ` (dot thousands, rounded, "đ" suffix, negative with "-").
5. Both call sites keep their props and flows: after Tạo đơn, Đóng goes to the order page; from the order
   page, Đóng closes.

## Out of scope

- The shared `ReceiptPreviewModal` (admin), PDF download (the old code has none), barcode, API, mobile.

## API and data

None. Reads `GET /api/outlets` (caller-scoped list) only when the order lacks outlet phone/address.
No CUID shown.

## Acceptance

- [x] 3–4 tested in `tests/web-receipt-model.test.ts` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [x] 1, 2, 5 checked in the browser: per-day and per-rental orders with discount / deposit / thế chân, order
      page, light / dark, 1440 / 390, print emulation shows only the slip
- [x] No API shape or business rule change → no iOS / Android change, no api-compat table needed
- [x] Strings under `orders.web.receipt` in `en` and `vi` (the only locales with `orders.json`)
