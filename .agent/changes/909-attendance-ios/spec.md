# Spec — iOS attendance (#909)

Contract: `.agent/changes/907-attendance-api/spec.md` (rules 5, 13, 17, 23, 24, 28, 32, 34).

## Behavior

1. `Merchant.modules: [String]?` decodes from login / profile; missing = nil = module off.
   Settings v2 refreshes it from `GET /api/users/profile` on appear (same throttle as the overlap setting).
2. Settings v2: when `attendance` is on, a first section with one card row "⏱ Chấm công" and a subtitle from
   `GET /api/attendance/me`: "<shift name> <start>–<end> · <status>" (status: chưa vào ca / đang trong ca / đã xong);
   without a shift today only the status. Tap → Chấm công.
3. Chấm công: header "‹ Chấm công"; shift card "Hôm nay · T2 12/10/26", shift line, "<outlet> · <status>";
   one big button: "Vào ca" (primary) when no open record, "Ra ca" (dark) when one is open; a hint under Vào ca;
   row "Ca và công của tôi ›".
4. Button → scan screen: camera, frame, "Đưa mã QR ở quầy vào khung", "Đang kiểm tra vị trí…".
   Location starts at once (best accuracy, when-in-use). On a code: wait for a fix (≤ 10 s), then punch with
   `accuracy = horizontalAccuracy`, `isMock = sourceInformation?.isSimulatedBySoftware ?? false` (iOS 15+).
   No fix → error "Chưa định vị chính xác". Camera or location denied → alert with "Mở Cài đặt".
   Debug builds: a "Nhập mã" button for the Simulator.
5. Success IN: green box "✓ Đã vào ca HH:mm" + "Cách chi nhánh N m · GPS ±N m", button becomes Ra ca.
   Success OUT: "✓ Đã ra ca HH:mm" + "Hôm nay X,X giờ (HH:mm – HH:mm)", button Vào ca, hint "Có thể vào ca lần
   nữa trong ngày (nhiều lượt)." Times = server instants shown in the shop zone.
6. Rejection: one red box, mockup copy:
   OUT_OF_RANGE "Bạn đang ở xa chi nhánh" / "Cách N m. Cần đứng trong R m.";
   MOCK_LOCATION "Phát hiện vị trí giả" / "Tắt ứng dụng giả lập vị trí rồi thử lại.";
   QR_EXPIRED "Mã QR không còn hiệu lực" / "Quét mã đang dán / hiện ở quầy hôm nay.";
   QR_WRONG_OUTLET "Mã QR của chi nhánh khác" / "Bạn thuộc <outlet>.";
   GPS_INACCURATE "Chưa định vị chính xác" / "GPS ±N m. Ra gần cửa rồi thử lại.";
   ATTENDANCE_NOT_CONFIGURED, MODULE_NOT_ENABLED and others: title + API message.
7. Ca và công của tôi: "TUẦN NÀY" rows Mon–Sun of the VN week that have a shift or a record:
   "T2 12/10" + shift "Sáng 08–12", right "07:58–12:01 · 4,0 g", late "08:07–12:00 · muộn 7′" in amber,
   no record "—". "THÁNG 10/2026": Tổng giờ "96,5 giờ", Ngày đi làm "22".
   Data: `GET /api/attendance/shifts?outletId&from&to` (own row) + `GET /api/attendance/people/<me>/month`.
8. `SHIFT_CHANGED`: inbox row tap and push tap open Ca và công của tôi. Inbox payload decoding accepts number or
   string ids and unknown keys.
9. Strings in en and vi (`Localizable.strings`).

## Out of scope
Kiosk screen, manager screens, offline punch, Android (#910), web (#908).

## Acceptance
- [ ] Unit tests for the pure logic (button state, subtitle, error copy, week rows, number format, lenient decode)
- [ ] `xcodebuild … build` BUILD SUCCEEDED
- [ ] E2E on a visible Simulator against the #907 API: Settings row, Vào ca, Ra ca, one rejection, my shifts
