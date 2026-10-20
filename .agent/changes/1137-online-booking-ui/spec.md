# Spec — #1137

1. Strings: `booking.chip`, `booking.title` = "Đơn online" / "Online orders"; `booking.detail.title` = "Đơn online" / "Online order". Same for Android `booking_*`.
2. Reject sheet (iOS `UISheetPresentationController`, medium + large, grabber; Android `ModalBottomSheet`):
   - title `booking.reject.sheetTitle` "Từ chối đơn online"
   - description `booking.reject.sheetDescription` "Chọn lý do để báo cho khách. Khách sẽ nhận được lý do này."
   - one row per `BookingRejectReason` (tap selects, check mark), tags `booking.reject.<API value>` (Android) kept
   - note field `booking.reject.note`, placeholder "Ghi chú cho khách (không bắt buộc)"; required when "Khác"
   - send button `booking.reject.send` "Từ chối", enabled when a reason is picked (and a note for Khác)
   - send calls the same reject API with reason + trimmed note (empty → none)
3. No API, model or reason change.

Acceptance: build both apps; screenshots of chip, list title, detail title, reject sheet.
