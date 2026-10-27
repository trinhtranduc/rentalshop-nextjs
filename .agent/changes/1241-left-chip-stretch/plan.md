# Plan #1241
- iOS: `CartV2ViewController` đưa chip ra dòng riêng `[chip, spacer]`; `PillControl` mở rộng vùng bấm; `openProduct(productId:focusDay:)`.
- Android: `CartV2Screen.ItemRow` chip xuống dòng riêng `Alignment.Start`, `clickable` + `minimumInteractiveComponentSize`; `onOpenCalendar` nhận ngày nullable.
- Test: không có logic thuần mới (điểm đến là màn có sẵn); chạy test hiện có, locales-valid-json, mobile-error-catalog.
