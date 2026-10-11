# Spec #802

## Phong cách (từ mockup)
- Màu: nền trang `#f3f5f8`, thẻ trắng, chữ `#17212e`, chữ phụ `#5d6b7d`, viền `#dde3ec`, nhấn xanh dương `#1d4ed8`, nền nhấn nhạt `#eaf0fe`. Xanh lá/đỏ/vàng chỉ dùng cho trạng thái (ok `#0f7a4d`, cảnh báo `#9a5b00`).
- Bo góc 10px (`--radius: 0.625rem`); nút và ô nhập cao tối thiểu 44px trên điện thoại; số dùng chữ số cùng độ rộng.
- Thẻ có viền, không đổ bóng nặng; pill cho trạng thái; thanh nút hành động cố định ở đáy trong dialog.

## Bước 1 — token (PR này)
- Chỉ `apps/admin/app/globals.css`: các biến shadcn (`--primary`, `--ring`, `--accent`, `--muted*`, `--border`, `--input`, `--radius`...) và các biến thương hiệu (`--brand-*`, `--action-*`, `--text-*`, `--background-*`, `--border-*`) đổi sang bộ trên; xanh lá thương hiệu `#4CAF50` bỏ.
- `--background` giữ trắng (hộp thoại dùng `bg-background`); màu nền trang đi qua `--background-primary`.
- Không đổi `packages/ui` (dùng chung với web shop) và không đổi `apps/client`.
- Chưa có chế độ tối: nhiều màn còn dùng màu cố định (`bg-white`, `text-gray-900`). Token tối làm cùng bước 2 trở đi khi các màn dùng token.

## Kiểm tra mỗi PR
Ảnh trước/sau ở 390px và 1280px; không tràn ngang; e2e admin trên điện thoại; test tĩnh trong `tests/`.
