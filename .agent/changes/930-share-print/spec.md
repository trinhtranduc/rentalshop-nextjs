# Spec — #930

Status: accepted · Intent: ./intent.md · Base spec: ../640-share-image/spec.md (updated there too)

## A. Share image (orders, rent and sale; the cart draft is unchanged)
1. No status pill on an order (the draft keeps "Chưa chốt").
2. Rent strip: Nhận đồ `<day>` → Trả đồ `<day>`; the middle shows a light arrow, no day count (draft unchanged).
3. Order number `#482113` smaller (~26 pt on the 540 pt canvas ≈ 18 px of the mockup), bold.
4. Kind line: "Đơn thuê · tạo 05/10/26 14:30" / "Đơn bán · tạo …" (en "Rental order · created …"), `dd/MM/yy HH:mm`
   in Vietnam time (`Asia/Ho_Chi_Minh`), shown upper-case.
5. Each item's own note (trimmed, when any) under that item's `qty × price` line, italic, brown `#92400E`.
   The order's general note is never shown.
6. Totals. Rent: "Giảm giá − x" (when > 0), "Đã đặt cọc x" (positive, when > 0), "Thế chân khi nhận đồ" (when any),
   highlight (blue) **"Tổng tiền thuê"** = order total. Sale: "Tạm tính", "Giảm giá − x", highlight "Tổng cộng".
   No "Còn phải trả".
7. VietQR: same account rules; payload without amount (tag 54 absent), content `DH<number>` kept; bank, account,
   holder, "Nội dung: DH<number>" shown.

## B. Order detail bottom bar and ⋯ sheet (iOS + Android)
1. Reserved rental: "In" + "Giao đồ"; renting: "In" + "Nhận trả". "In" is an outline button with no icon.
   Returned / cancelled: "In"; a sale that can be cancelled: "Huỷ · In" (unchanged).
2. Sheet = everything not on the bar, in the iOS order: Print, Share, Notes, Edit, Extend, History; then Cancel / Delete.
   So "Sửa đơn" (reserved, with rights) and "Gia hạn" (renting, when allowed) are in the sheet; Print is not when on the bar.
3. Sheet rows have no icons; titles and subtitles unchanged.

Tests: share model (no pill on orders, no days, created line vi/en in VN time, item notes shown / order note not,
totals per kind, QR without amount); `bottomButtons` / `sheetActions` (iOS) and `OrderActionSheet` (Android).
