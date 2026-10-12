# Spec — Android attendance clock in / out and my shifts

Issue: #910 · Status: accepted · Intent: ./intent.md · Contract: `.agent/changes/907-attendance-api/spec.md`

## Behavior

1. Login (`user.merchant.modules`) and `GET /api/users/profile` (read when Cài đặt shows) store the active
   module keys. Missing field or not an array = no modules. Logout clears them.
2. Cài đặt (new and old screen) shows "⏱ Chấm công" as the first row only when the keys contain
   `attendance`. Its second line is today's shift and status from `GET /api/attendance/me`
   ("Ca sáng 08:00–12:00 · chưa vào ca"); without a shift only the status; a failed read shows only the title.
3. Chấm công screen: a card "Hôm nay · T2 12/10/26" / shift name and times / outlet · status; ONE big button:
   "▣ Vào ca" (blue) when there is no open record, "▣ Ra ca" (dark) when there is one; hint
   "Bấm để quét mã QR ở quầy. Cần bật vị trí." (or "Có thể vào ca lần nữa trong ngày (nhiều lượt)." after an
   OUT); a row "Ca và công của tôi ›".
4. The button checks CAMERA and ACCESS_FINE_LOCATION. Missing → an explanation dialog, then the system
   request. Denied → a dialog with "Mở cài đặt" (app details settings).
5. Scan screen: full-screen camera, white rounded frame, "Đưa mã QR ở quầy vào khung" and
   "Đang kiểm tra vị trí…". It starts one location fix at once (GPS, network fallback, 20 s timeout). The first
   QR read sends `{ code, latitude, longitude, accuracy, isMock }`. `isMock` = `Location.isMock` (API 31+) or
   `isFromMockProvider`. Debug builds also show "Nhập mã (debug)" for a typed code (emulator).
6. Success: back on Chấm công with a green card "✓ Đã vào ca HH:mm" + "Cách chi nhánh N m · GPS ±M m", or
   "✓ Đã ra ca HH:mm" + "Hôm nay X,Y giờ (HH:mm – HH:mm)". Times are the server's record times in Vietnam
   time. The button flips. `me` is read again.
7. Rejected: one red card at a time with title + message:
   - `OUT_OF_RANGE` "Bạn đang ở xa chi nhánh" / "Cách {distanceM} m. Cần đứng trong {radiusM} m."
   - `MOCK_LOCATION` "Phát hiện vị trí giả" / "Tắt ứng dụng giả lập vị trí rồi thử lại."
   - `QR_EXPIRED` "Mã QR không còn hiệu lực" / "Quét mã đang dán / hiện ở quầy hôm nay."
   - `QR_WRONG_OUTLET` "Mã QR của chi nhánh khác" / "Bạn thuộc {outlet}." (no outlet name: "Quét mã của chi nhánh bạn làm.")
   - `GPS_INACCURATE` "Chưa định vị chính xác" / "GPS ±{accuracyM} m. Ra gần cửa rồi thử lại."
   - `ATTENDANCE_NOT_CONFIGURED` "Chi nhánh chưa cài chấm công" / "Nhờ chủ shop đặt vị trí và tạo mã QR."
   - `MODULE_NOT_ENABLED` "Cửa hàng chưa bật chấm công" / "Liên hệ chủ shop."
   - no location fix "Chưa lấy được vị trí" / "Bật vị trí rồi thử lại."
   - anything else: the generic API error text.
8. "Ca và công của tôi": "TUẦN NÀY" (Mon–Sun of the VN week) rows "T2 12/10" + shift ("Sáng 08–12") on the
   left; right "07:58–12:01 · 4,0 g", amber "08:07–12:00 · muộn 7′" when late, or "—" not worked yet.
   "THÁNG 10/2026": "Tổng giờ" "96,5 giờ", "Ngày đi làm" "22". Data: `GET /api/attendance/shifts`
   (own user) and `GET /api/attendance/people/{userId}/month`.
9. A push with `data.type == SHIFT_CHANGED` opens "Ca và công của tôi" on tap; an inbox row of that type too.
   Other notifications behave as before.
10. Days and times are Vietnam civil (`ShopTime.zone`), never the device zone.
11. New strings in `values` (English) and `values-vi`.

## Out of scope

Shop owner screens (QR, settings, timesheet) — web #908. Offline punch. Kiosk screen. Any API change.

## API and data

Reads only #907 routes: `GET /api/attendance/me`, `POST /api/attendance/punch`, `GET /api/attendance/shifts`,
`GET /api/attendance/people/{userId}/month`; `merchant.modules` of login / profile. Numeric ids only.
`AppError.Http` keeps the error body's `data` (distance / radius / accuracy) — additive.

## Acceptance

- [ ] Unit tests: modules parse, settings row visibility, error → copy mapping, me / punch / week parse, mock flag choice
- [ ] `./gradlew :app:assembleDebug` BUILD SUCCESSFUL, `:app:testDebugUnitTest` green
- [ ] E2E on AVD `anyrent_e2e` against a local #907 API: row, in, out, out-of-range, mock location, my shifts
- [ ] Screens compared with the mockup; iOS parity checked when #909 exists
