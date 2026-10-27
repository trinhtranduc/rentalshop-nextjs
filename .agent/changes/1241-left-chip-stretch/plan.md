# Plan #1241
- iOS: chip giữ ở góc phải, hugging required; `PillControl` mở rộng vùng bấm; `openProductCalendar(productId:focusDay:)`.
- Android: chip giữ trong Row cạnh tên (tên weight 1f, chip không weight), hộp bấm cao 48dp; `onOpenCalendar` nhận ngày nullable.
- Test: không có logic thuần mới (điểm đến là màn có sẵn); chạy test hiện có, locales-valid-json, mobile-error-catalog.
