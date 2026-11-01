# Plan: một nút "Thu giai đoạn N"

Issue: #1441 · Status: in-progress · Spec: ./spec.md

## Steps

1. Đọc code, lập bảng trạng thái có `file:line` trong issue. Kết quả: không có trạng thái nào mất đường thu.
2. Chạy `test7qStagedDeposit` trên dev, xác nhận fail ở bước chờ "Giao đồ".
3. Test fail trước: iOS `OrderMoneyBlockTests` dựng view thật, Android `OrderMoneyBlockTest` đọc source (như `HandOverReturnNoPaymentTest`).
4. Bỏ nút trên iOS và Android, sửa chú thích.
5. Sửa UI test theo luật mới, chạy trên Simulator riêng, chạy Android bằng adb trên AVD riêng có cửa sổ.
6. Sửa pathspec, chạy thật `--build`.
7. Skills: `mobile-parity`, `mobile-e2e-local`, `verify-change`.

## Verify

```bash
# iOS, simulator riêng đã erase
xcodebuild test -workspace "POS ADBD.xcworkspace" -scheme Development -only-testing:"POS ADBDTests" ...
# Android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:testDebugUnitTest :app:assembleDebug
```

## Rollback

Revert PR. Không có dữ liệu hay API cần hoàn tác.
