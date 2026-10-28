# Plan — Sheet Lấy hàng bỏ list món

Issue: #1287 · Spec: ./spec.md

1. iOS `OrderHandOverSheetViewController.swift`: chỉ thêm `itemRow` khi mode là `.takeReturn`.
2. Android `OrderDetailV2Sheets.kt`: bỏ `SheetItems(detail)` trong `HandOverSheet`.
3. Mockup: tab 2 artifact 9b56KwErJWiGpiyFEfyEY4 bỏ list món trong sheet hand-over.
4. Kiểm: iOS unit test (Development), Android testDebugUnitTest + assembleDebug, ảnh sheet iOS.
