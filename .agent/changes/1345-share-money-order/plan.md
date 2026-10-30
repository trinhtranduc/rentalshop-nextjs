# Plan — Ảnh chia sẻ đơn: thứ tự phần tiền

Issue: #1345 · Status: in-progress · Spec: ./spec.md

## Steps

1. Test đỏ (commit riêng): iOS `OrderShareImageTests` và Android `OrderShareModelTest`, bảy khung a-g của mockup + công thức + không đổi theo trạng thái. Chạy để thấy đỏ.
2. Hàm thuần `ShareMoneyRule.collectOnDelivery` (iOS `OrderShareImage.swift`, Android `OrderShareModel.kt`), có test.
3. Model: thay `rows` / `highlight*` / `plan` bằng danh sách có thứ tự `money` (hàng, ô tổng, khối đợt, ô thu khi giao).
4. Renderer iOS và Android vẽ theo `money`; ô Thu khi giao viền nhạt; hàng xám cho "Chưa cọc".
5. Chuỗi en + vi (`mobile-parity`, `i18n-keys` chỉ phần mobile).
6. Verify: iOS `xcodebuild test -only-testing:POS ADBDTests/OrderShareImageTests`, Android `:app:testDebugUnitTest --tests OrderShareModelTest`, build Android; chụp ảnh từ Simulator với API cục bộ.

## Files

- `apps/mobile/POS ADBD/Model/OrderShareImage.swift`, `Utils/OrderShareRenderer.swift`, `en.lproj` + `vi-VN.lproj/Localizable.strings`, `POS ADBDTests/OrderShareImageTests.swift`
- `apps/mobile-android/.../domain/orders/OrderShareModel.kt`, `ui/orders/OrderShareRenderer.kt`, `res/values{,-vi}/strings.xml`, `OrderShareModelTest.kt`
- Không đổi `DepositPlanReceipt` (phiếu in dùng).

## Phát hiện (ghi trong PR, không sửa ở đây)

Chi tiết đơn: Thu khi giao = tổng − `depositAmount` + thế chân − đã thu trước, `depositAmount` chỉ cộng đợt ĐÃ thu (`apps/api/lib/installments.ts:115`). Đơn còn đợt 2 chưa thu: số này = phần còn lại + đợt 2 (+ thế chân), lớn hơn dòng "Phần còn lại, thu khi giao" của thẻ đợt. Ảnh chia sẻ dùng công thức kế hoạch. Đề xuất issue riêng để chi tiết đơn gọi hai số này bằng hai nhãn khác nhau.

## Risks

App cũ giữ ảnh cũ (không API). Hai app lệch nhau: test cùng số liệu.

## Rollback

Revert PR; ảnh trở lại thứ tự cũ.
