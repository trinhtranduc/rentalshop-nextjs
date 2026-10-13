# Spec — Attendance web screens (#908)

Issue: #908 · Contract: `.agent/changes/907-attendance-api/spec.md` (rule numbers below are its numbers)
Mockup: `.agent/changes/907-attendance-api/mockup.html`, part "Web".

## Behavior

1. Nav item **Chấm công** (`/attendance`) shows when the merchant's active modules (`merchant.modules`
   from login, refreshed from `GET /api/users/profile`) include `attendance` and the role is MERCHANT or
   OUTLET_ADMIN. OUTLET_ADMIN also sees **Chi nhánh** while the module is on. Otherwise the nav is unchanged.
2. Attendance pages share a tab strip (Bảng công, Chi tiết theo người, Xếp ca, Mẫu ca) and an outlet in
   `?outletId=` (MERCHANT picks among its outlets; OUTLET_ADMIN is fixed to its outlet). A role without
   access or a merchant without the module sees a short "not available" note.
3. **Bảng công** (rule 26): month `?month=YYYY-MM` (default the VN current month), ‹ › month,
   4 KPIs (total hours, pairs, missing out, suspected), grid rows = users, columns 1..days-in-month, cell:
   - `missingOut` → red "!"; else `suspected` → dashed red; else `overtime` → purple; else `late|early`
     → amber; else hours > 0 → blue (hours, comma decimal, 1 digit);
   - no hours, a scheduled shift (`/shifts`, rule 23) and the day is before today (VN) → grey "Vắng";
   - empty Sunday → grey "·"; Sunday header grey.
   Totals: hours and days. Name → person page; cell → person page of that user and month.
   **Xuất Excel** dialog: month (previous / shown), parts grid / scans / edits → `.xlsx` (rule 31).
   **Khoá tháng** dialog (MERCHANT only, rule 30); a locked month shows "đã khoá" and **Mở khoá tháng**.
4. **Chi tiết theo người** (rule 28): user picker, ‹ month ›, filter (all / rejected / suspected),
   6 KPIs, rows grouped by day (day label, day hours), time with seconds, Vào/Ra/Sửa,
   Ghi nhận/Từ chối/Tự đóng/Đã sửa, distance, ±accuracy, coordinates, shift, note (error text,
   late / early / overtime minutes, suspected reasons, edit note). **Bản đồ** on rows with coordinates
   (outlet circle + scan point). **Sửa** on a record (rule 29 PATCH, reason required), **+ Thêm lượt**
   (POST). Times typed are VN wall-clock on the record's day (out < in → next day). Hidden when the month
   is locked or (OUTLET_ADMIN) the person is the caller.
5. **Xếp ca** (rules 20–23): week Mon–Sun of `?week=YYYY-MM-DD`, ‹ › week, rows = active users of the
   outlet, chips colored by template, 🔒 when locked, ✎ when `source = DAY`. Locked chip → "không sửa được"
   dialog. Unlocked chip or "+" (today or later) → day dialog: template / Giờ riêng / Xoá ca ngày này
   (`PUT /shifts/day`). **Gán ca** dialog: template, users, weekdays (default T2–T6), start (default today),
   optional end, preview line ("↻ Lặp mỗi tuần · names · shift · weekdays · từ date") plus a line per chosen
   user who already has a rule on one of those weekdays. Table "Lịch lặp đang áp dụng" (rules whose end is
   today or later, or none) with Sửa (template, weekdays, Áp dụng từ = tomorrow), Dừng từ… (last date,
   default end of month), Xoá.
6. **Mẫu ca** (rule 19): table (chip, time, break, used), **+ Mẫu ca mới** / Sửa dialog (name, start, end,
   break, color Xanh/Tím/Lục/Cam, cross-midnight note), Ẩn when used / Xoá when not; hidden templates show
   "Đã ẩn" and **Hiện lại**.
7. **Chi nhánh** list: "Chấm công" column from `GET /settings` (rule 7): "Có mã QR · đổi mỗi ngày / cố định"
   or "Chưa tạo mã", and **Mở ›** → `/outlets/<id>/attendance`.
8. Outlet attendance page: name, address and phone read only. Location card: map with radius circle,
   coordinates, "📍 Vị trí hiện tại", "Chọn trên bản đồ", radius slider 50–500 m step 10; MERCHANT only
   (OUTLET_ADMIN read-only); **Lưu** asks "Đổi bán kính? / Đổi vị trí?" then `PUT /settings`.
   QR card: select Đổi mỗi ngày / Cố định (`PUT qrMode`), "Tạo mã QR" when none; else the code, caption
   (today's date or creation date), **In QR** (A5 print page with name and help line), **Liên kết máy quầy**
   (copy, create new link), **Tạo mã mới** (confirm; rule 9).
9. `/kiosk/qr/<token>` is public (no shell, no login redirect): `GET /api/attendance/kiosk/qr` with
   `X-Kiosk-Token`, big QR, outlet name, help line, last 5 punches; reloads after `refreshAfterSec` and at
   VN midnight; 401 / 403 / 422 show a plain message instead of redirecting to login.

## Out of scope

Geocoding an address, payroll, admin module card (#907), mobile (#909/#910), any API change.

## Acceptance

- [ ] Pure logic (cell colours, Vắng, lock display, recurring preview, weekday ranges, month / week keys,
      VN wall-clock ↔ ISO) unit-tested under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [ ] Nav tests: module off → no Chấm công; staff / kho never
- [ ] New keys in all five locales
- [ ] Headed Chrome walk of every screen and dialog against the #907 API, screenshots compared to the mockup
