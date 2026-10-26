# app cũ gửi lại thứ API đã đổi cho nó

Status: active · Added: 2026-10-26 · Source: #1215

## Failure

1. Shim #1189 đưa option BLOCK cho app cũ dưới dạng FIXED giá ngày 1. App cũ lưu sản phẩm gửi lại đúng dòng đó (`type/price/isDefault`, không `id`); server giữ BLOCK (#1200) và tạo thêm FIXED => hai dòng `isDefault=true`. Sửa shim ở chiều đi mà không xử lý chiều về.
2. `salePrice: null` làm Android cũ thành NaN (`ApiClient.kt:1431`) và crash ở giỏ (`CartStore.kt:815`). Đọc Swift `Codable` mà quên đọc org.json `optDouble`.

## Detect

```bash
cd tests && yarn test api/product-echoed-block-shim api/legacy-sale-price
```

## Pass

- Lưu sản phẩm BLOCK từ client không có `pricingSchemaVersion`: không tạo FIXED trùng giá ngày 1, chỉ một dòng `isDefault`.
- Android không capability nhận `salePrice: 0`; iOS, web, client có capability nhận `null`; field khác không đổi.

## Notes

Mỗi shim cho app cũ cần một test vòng đi-về (đọc rồi lưu lại nguyên payload). Khi đổi kiểu một field cho app cũ, đọc cả bộ giải mã Swift lẫn Kotlin trên `main-real`.
