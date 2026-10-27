# Spec: tìm sản phẩm không phân biệt dấu

- Từ khoá và tên sản phẩm cùng được chuẩn hoá: NFC, bỏ dấu, `đ`→`d`, chữ thường.
- Giữ nguyên: khớp đầu từ (sau khoảng trắng hoặc dấu câu), mọi từ phải khớp, giới hạn theo merchant, khớp barcode.
- Phía SQL: `unaccent(lower(normalize(col, NFC)))` cho mọi từ khoá.
- Tiêu chí: "Họa", "Hoạ", "hoa", "HOA", "họa" (NFD), "Hoạ t" đều tìm ra "Hoạ tiết" và "Họa tiết" (NFC và NFD); "oa" (giữa từ) vẫn không ra.
- Không đổi: schema, response, phân trang, sắp xếp. iOS/Android: không đổi code (gọi API).
