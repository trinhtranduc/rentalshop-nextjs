# Spec — Mobile orders tab matches its boards

Issue: #401 · Status: done · Intent: ./intent.md

## Behavior

1. **Header (rent mode):** title "Đơn thuê" 24/700 left, outlined button "Đơn bán" (40 high, radius 10) right.
   Tapping it shows the sale list in the same tab with title "Đơn bán" and button "Đơn thuê" (switches back).
2. **Search:** grey field (44 high, radius 12) with a magnifier, placeholder "Tìm tên, SĐT, mã đơn, tên đồ" and a
   scan button at the trailing end. Focusing the field enters search mode (VL-tim): the title, segments and chips hide,
   the field gets a blue 2px border and a round clear button, and "Huỷ" appears to the right. "Huỷ" clears and leaves.
   A scanned code fills the field and searches (rent and sale, every status).
   The line under the field reads "N đơn khớp “q” · tìm trong mọi trạng thái, cả tên đồ" (N = API total).
3. **Segments:** "Việc cần làm" (red badge = rows in TRỄ HẠN + HÔM NAY) and "Tất cả đơn", pill style.
   Without the dashboard permission (403) only the rent list shows and the segment control is hidden.
4. **Việc cần làm bands:** "TRỄ HẠN · n" on `#FEF2F2` in red, "HÔM NAY · T7 03/10", "NGÀY MAI · CN 04/10" on
   `#F8FAFC`; right side "giao N · trả M" (hand-over and take-back rows of the band).
5. **Rows (flat, divider `#F1F5F9`, no cards):**
   - line 1: tag + customer name (15/600, one line);
   - line 2: items with quantity "Áo dài trắng ×2" (13, `#334155`);
   - line 3 (12, muted): `#<short number> · <when>`; short number = the part after the last "-" of the order number
     (ORD-1-0053 → 0053), else the whole number;
   - pills: "Chưa soạn đồ" (orange, hand-over rows not ready), "Trễ N ngày" (red);
   - right: total (15/700) and the pay line; outlined 40×40 call button only on TRỄ HẠN rows with a phone; chevron.
6. **When text:** late hand-over "hẹn giao T6 02/10"; late take-back "hạn trả T5 01/10"; today / tomorrow
   "03/10 → 05/10 · 3 ngày" (inclusive civil days of the device zone). Tất cả đơn: "tạo hôm nay · 05/10 → 07/10",
   "tạo 02/10 · 04/10 → 05/10"; a late PICKUPED order "tạo 28/09 · hạn 02/10"; cancelled "tạo 28/09 · huỷ 29/09".
   Search: late rent "hạn 01/10", PICKUPED "trả T3 06/10", sale "bán T6 02/10", others "27/09 → 28/09".
7. **Pay line (Việc cần làm):** `refundDue > 0` → "trả cọc X" (purple `#5B21B6`); else `amountDue > 0` → "còn thu X"
   (`#9A3412`); else "✓ đã thu đủ" (green `#047857`).
8. **Tags:** Giao `#DBEAFE/#1E40AF`, Trả `#EDE9FE/#5B21B6`, Đã đặt blue, Đang thuê purple, Đã trả green
   `#D1FAE5/#047857`, Đã huỷ grey `#F1F5F9/#475569` with the total struck through, sale "Hoàn thành" green,
   search sale rows "Bán · Hoàn thành".
9. **Tất cả đơn:** chips Tất cả · Đã đặt · Đang thuê · Đã trả · Đã huỷ (selected = dark pill) apply at once;
   below, "Mới tạo nhất ⌄" (primary colour, current sort) opens the Loc sheet; "N đơn" (API total) on the right.
10. **Loc sheet:** "Lọc & sắp xếp" + "Đặt lại"; SẮP XẾP: Mới tạo nhất, Ngày giao gần nhất, Ngày trả gần nhất;
    KHOẢNG NGÀY: Ngày tạo / Ngày giao / Ngày trả and Bất kỳ, Hôm nay, 7 ngày tới, Tháng này, Chọn ngày;
    button "Xem N đơn" (count of the list with the sheet's choice, fetched while the sheet is open).
11. **Đơn bán:** groups by sale day "HÔM NAY · T7 03/10", "HÔM QUA · T6 02/10", else "T5 01/10"; right side
    "N đơn · X" (cancelled orders not counted); rows with Hoàn thành / Đã huỷ tag, customer, items, "#number",
    total (struck through when cancelled), chevron.
12. Staff money hiding (iOS, setting "hide financial data for staff") hides totals, pay lines and band sums.
13. With `newOrders` off the old screen shows, unchanged.

## Out of scope

- "Việc gần nhất" sort and its hint (the list API cannot sort that way).
- "còn thu / đã thu đủ / phí trễ" on Tất cả đơn and search rows (the list API has no per-step payments).
- "Thiếu 1 bộ · trùng #0061" pill (no shortage data in the today-work rows).

## API and data

None changed. Read: `GET /api/analytics/outlet-operations` (adds `totalAmount` to the mobile row model) and
`GET /api/orders` (`total`, `orderItems`, `updatedAt`; `sortBy` createdAt / pickupPlanAt / returnPlanAt;
`startDate`, `endDate`, `dateField` createdAt / pickedUpAt / returnedAt, `timeZone`).

## Acceptance

- [x] Unit tests: band counts and badge, date-line text, pay-line choice, short number, date-range presets
- [x] Existing orders tests green on both apps
- [x] Screenshots next to the boards under the scratch `p401/compare/` folder
- [x] Staff: money hidden where it was; flag off: old screen
