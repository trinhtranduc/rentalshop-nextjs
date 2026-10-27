# Plan #1241
- iOS: `PillControl.intrinsicContentSize` (dot + chữ + inset), hugging required; tên hugging thấp nhất; chip giữ góc phải; `PillControl` mở rộng vùng bấm; `openProductCalendar(productId:focusDay:)`.
- Android: chip là Row cạnh tên (tên weight 1f, chip không weight), `clickable` trực tiếp trên chip; `onOpenCalendar` nhận ngày nullable.
- Test: không có logic thuần mới (điểm đến là màn có sẵn); chạy test hiện có, locales-valid-json, mobile-error-catalog.
