# Spec #1332

1. `canEditPrintSettings(role)` chỉ đúng với MERCHANT.
2. Vai trò khác thấy ghi chú đã lưu của chi nhánh trong ô chỉ đọc, không có nút Lưu, kèm câu "Chỉ chủ shop sửa được ghi chú và QR. Áp dụng cho cả chi nhánh."
3. Công tắc QR bị khoá với mọi vai trò trừ MERCHANT, câu giải thích không còn nhắc quản lý chi nhánh.
4. Ghi chú trống thì ô hiện chữ "Chưa có ghi chú".

Ngoài phạm vi: quyền ở API, `packages/ui/.../ReceiptSection.tsx` (không màn nào dùng).
