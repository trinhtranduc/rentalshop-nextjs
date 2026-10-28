# products: PUT từ app cũ giữ option BLOCK và giá

Status: active · Added: 2026-10-25 · Source: #1200

## Failure

iOS và Android cũ không thấy option BLOCK. Bấm Lưu sản phẩm không đổi gì gửi `rentPrice: 0, salePrice: 0, pricingOptions: []`. API xoá option BLOCK và ghi `rentPrice` về 0 (quan sát bằng app thật trên `main-real`).

## Detect

```bash
cd tests && yarn test api/product-keep-block-options
```

## Pass

- Payload không có `pricingSchemaVersion` trên sản phẩm có BLOCK: không xoá option BLOCK; `pricingOptions: []` không đụng option nào; `rentPrice`/`salePrice` bằng 0/null không ghi đè.
- Giá thật khác 0 do app cũ nhập vẫn được lưu. Sản phẩm không có BLOCK, và client gửi `pricingSchemaVersion`, giữ hành vi cũ.

## Notes

Lưu danh sách ("replace set") từ client không biết một loại dữ liệu sẽ xoá loại đó. Chỉ thay phần client có thể thấy.
