# Spec #1014

1. `POST /api/attendance/punch`, check 5 (QR valid, outlet in scope, setting has no latitude or longitude):
   422 `ATTENDANCE_LOCATION_NOT_SET`, `data: { outlet: { id, name } | null }`; the scan row stores that result.
   Checks 1–4, 6 and 7, the statuses and the order stay the same.
2. `GET /api/attendance/kiosk/qr`: unchanged (`ATTENDANCE_NOT_CONFIGURED`).
3. Messages (`locales/*/errors.json`, `ResponseBuilder` default):
   - vi: "Chi nhánh chưa đặt vị trí chấm công nên chưa đo được khoảng cách. Nhờ chủ shop đặt vị trí ở Chấm công › Mã QR & vị trí."
   - en: "This branch has no attendance location yet, so the distance cannot be checked. Ask the shop owner to set it in Attendance › QR & location."
   - ja / ko / zh translated.
4. Apps (iOS `AttendanceLogic.errorCopy`, Android `AttendanceLogic.rejection` + `AttendanceTexts`):
   `ATTENDANCE_LOCATION_NOT_SET` → title "Chi nhánh chưa đặt vị trí" ("<name> chưa đặt vị trí" when the outlet
   is named), message "Chưa đo được khoảng cách. Nhờ chủ shop đặt vị trí ở Chấm công › Mã QR & vị trí.".
   `OUT_OF_RANGE`, `GPS_INACCURATE`, `NO_LOCATION` and `ATTENDANCE_NOT_CONFIGURED` keep their copy.
5. Web: a scan label for the new code ("Chi nhánh chưa đặt vị trí") on the person page and in the export.
