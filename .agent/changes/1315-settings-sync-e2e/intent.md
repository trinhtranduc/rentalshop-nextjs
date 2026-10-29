# Intent: e2e đồng bộ cấu hình giữa các vai trò (#1315)

Status: in-progress. Issue: #1315. Epic: #1309.

## Muốn gì, vì sao
Chủ shop: "Bổ sung test flow của setting ở các role, xem nó đồng bộ không." Cấu hình cấp shop/chi nhánh phải giống nhau trên mọi máy: chủ shop đổi thì quản lý chi nhánh và nhân viên đọc thấy giá trị mới, và chỉ đúng vai trò mới sửa được.

## Ràng buộc
- Chỉ thêm test và tài liệu, không đổi code app/API (không ảnh hưởng app cài sẵn).
- Test API chạy trên API và DB cục bộ. Test giao diện mobile chỉ viết, chưa chạy; lần chạy sau phải hiện cửa sổ.
- Viết theo hành vi hiện tại của API. Chỗ quy tắc mới chưa làm (ghi chú in và tài khoản ngân hàng chỉ chủ shop sửa) ghi chú rõ trong tên test.
