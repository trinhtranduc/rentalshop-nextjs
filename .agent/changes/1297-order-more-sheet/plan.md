# Plan

1. iOS: bỏ title khỏi `OrderActionSheet`; `sheetSubtitle` trả mô tả cho edit/extend/history/notes; chuỗi mới vào en + vi-VN.
2. Android: `OrderActionsSheet.kt` bỏ tiêu đề, thêm mô tả; `strings.xml` en + vi.
3. Cập nhật test chuỗi sheet (iOS `ChangeHistoryTests`, `AnyRentE2ETests.orderSheetTitle`; Android `Issue518519ResourcesTest`, `OrderActionSheetTest`).
4. Kiểm chứng: iOS unit test, Android testDebugUnitTest + assembleDebug, ảnh sheet vào `shots/`.
