# Spec — #1535

Status: in-review

## API (`POST /api/products/bulk-import`)

1. Mọi câu trả lời 200 có `rows`: đúng một phần tử cho mỗi sản phẩm gửi lên, theo thứ tự, `row` = vị trí trong `products` (từ 1), như `errors[].row`.
2. Tạo mới: `{ row, status: 'created' }`.
3. Món đã có được thêm tồn (#1533): `{ row, status: 'updated', outlets: [id đã ghi], skippedOutlets: [id đã có hàng] }`.
4. Mã vạch đã có ở món đang dùng, không ghi gì (đường cũ, hoặc mọi chi nhánh bật đã có hàng): `{ row, status: 'duplicate', reason: 'barcodeExists', existingName, skippedOutlets? }` (`skippedOutlets` chỉ khi gọi có chi nhánh).
5. Mã vạch của món đã xoá: `{ row, status: 'duplicate', reason: 'barcodeDeleted', existingName }`.
6. Có dòng không hợp lệ: dòng đó `{ status: 'failed', error }` (cùng chữ với `errors[]`), các dòng khác `{ status: 'notImported' }`; không ghi gì.
7. Lỗi khi ghi dòng N (rollback): dòng N `failed`, dòng đã tạo / thêm tồn trong lần đó thành `notImported`; dòng trùng vẫn `duplicate`.
8. Trùng mã vạch phát hiện lúc ghi (P2002): `{ status: 'duplicate', reason: 'barcodeExists' }`.
9. `imported`, `skipped`, `failed`, `total`, `errors`, `updated`, `byOutlet` không đổi giá trị so với trước.

## Web (`/products/import`, bước 3)

10. Kết quả tính cho **mọi dòng dữ liệu của file**, theo thứ tự dòng: dòng gửi lên lấy trạng thái từ `rows`; dòng lỗi ở bước kiểm tra: "Lỗi" với lý do (riêng lỗi chỉ là trùng mã vạch trong file: "Trùng mã vạch", "trùng với dòng N"); dòng bỏ chọn: "Không nhập · Không chọn"; dòng chưa bật chi nhánh: "Không nhập · Chưa bật chi nhánh nào"; `notImported`: "Không nhập · Dòng khác bị lỗi nên chưa nhập".
11. Hàng số liệu: Tất cả dòng, Đã tạo, Thêm tồn (khi có chi nhánh hoặc > 0), Trùng mã vạch, Lỗi, Không nhập, mỗi ô có số. Bấm ô → danh sách chỉ còn trạng thái đó; ô số 0 không bấm được; mặc định "Tất cả dòng".
12. Chi tiết: Đã tạo → số lượng theo chi nhánh đã bật ("Main 2 · Outlet 2 0 hết hàng") hoặc "Số lượng 5"; Thêm tồn → chi nhánh nhận số và chi nhánh bỏ qua vì đã có hàng; Trùng → "Đã có: <tên>" (+ "đã có hàng ở …"), hoặc "Mã của sản phẩm đã xoá: <tên>"; Lỗi API → chữ lỗi.
13. API không có `rows` (API cũ): màn như trước (danh sách "Dòng bị từ chối").
14. Khổ 390px không tràn ngang.

## Out of scope

Xuất kết quả ra file, sửa dòng lỗi ngay trên màn kết quả, dịch chữ lỗi của API (#985), điện thoại.
