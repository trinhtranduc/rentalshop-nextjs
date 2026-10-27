# Spec

- iOS `CartV2ViewController.customerRow()`: tên khách `DS.TextSize.name` -> `DS.TextSize.body`.
- iOS `datesRow()`: nhãn ngày (cả "Chọn ngày thuê" và "d/M/yy -> d/M/yy") `name` -> `body`.
- Android `CartV2Screen.kt` `CustomerRow` và hàng ngày trong `CartV2Screen`: `DS.TextSize.Name` -> `DS.TextSize.Body`.
- Web `OrderEditor.tsx` thẻ khách: `text-base` -> `text-[15px]`. Nút ngày của web nằm ở đầu trang (không phải trong giỏ), đã là 15px, không đổi.
- Không đổi: số điện thoại (14), nút Đổi, chip ngày, chiều cao hàng (min 60), chuỗi, API.
