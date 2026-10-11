# Spec #802

## Mục tiêu (chủ shop, 2026-10-11)
Admin **dễ quản lý trên cả điện thoại và web**. Một bộ giao diện, hai cỡ màn hình, không làm hai bản. Tiêu chí cho mọi PR của #802:
- Ở 390px: không tràn ngang, mọi thao tác chính với tới bằng một ngón tay (nút và ô nhập cao tối thiểu 44px, nút hành động chính cố định ở đáy dialog và form), danh sách thành thẻ, menu mở dạng ngăn kéo.
- Ở 1280px: cùng nội dung và cùng nút, bố cục rộng (sidebar cố định, bảng có tiêu đề cố định).
- Cùng một bộ component và token cho hai cỡ; ảnh trước/sau của mỗi PR chụp cả hai cỡ.

## Phong cách (đổi 2026-10-11: theo web portal, không theo mockup add-on)
Chủ shop thích style của web portal (`apps/client`, `ShopShell`) và muốn admin theo đó. Portal dùng bộ token `--ar-*` (RGB, nền trang `#f3f4f6`, chữ `#0f172a`, chữ phụ `#475569`, nhấn xanh dương `#1d4ed8`, nền nhấn nhạt `#eff6ff`, viền `#e2e8f0`), màu Tailwind `ar-*`, chế độ tối qua `.ar-theme` + `data-ar-theme`, sidebar trắng với mục đang chọn nền xanh nhạt, thanh tìm kiếm trên cùng, nút xanh bo tròn, thẻ có viền, chip lọc, bảng có tiêu đề cố định, pill trạng thái, font Be Vietnam Pro.

## Bước 1: token (PR này)
- `apps/admin/app/globals.css`: các biến thương hiệu và shadcn lấy giá trị của portal (xanh `#1d4ed8`, `--primary`/`--ring` `224 76% 48%`, ink/muted/page); xanh lá `#4CAF50` bỏ; khối `--ar-*` sáng và tối chép nguyên từ `apps/client`.
- `apps/admin/tailwind.config.js`: màu `ar-*` và `shadow-ar` chép từ `apps/client`.
- `--background` giữ trắng (hộp thoại dùng `bg-background`).
- Không đổi `packages/ui` và `apps/client`. Chưa có chuyển chế độ tối ở admin (bước 2 trở đi, khi các màn dùng token `ar-*`). Font Be Vietnam Pro nạp ở bước 2 cùng khung trang.
- Test `tests/admin-theme-tokens.test.ts` giữ cho admin và portal không lệch token.

## Các bước sau
2 khung trang theo `ShopShell` (sidebar, thanh tìm kiếm, nút tạo, chế độ tối); 3 danh sách; 4 chi tiết; 5 dialog và form; 6 dashboard. Mỗi PR có ảnh trước/sau ở 390px và 1280px.
