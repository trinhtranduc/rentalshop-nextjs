# Spec — Số dòng mỗi trang gõ được

Issue: #1362 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `parsePageSize(raw, fallback = 10)` trả số nguyên 1..3000; 3001 trở lên kẹp 3000; 0, âm, chữ, rỗng, số lẻ trả `fallback`.
2. `PAGE_SIZE_PRESETS = [10, 20, 50, 100]`, `MAX_PAGE_SIZE = 3000`.
3. `commitPageSize(typed, current)`: rỗng/chữ giữ `current`; ngoài khoảng kẹp về 1 hoặc 3000 và báo `clamped`.
4. Chân bảng hiện 4 nút nhanh (số đang chọn tô sáng) + ô gõ (`inputMode="numeric"`); Enter hoặc rời ô áp dụng; số trùng nút nhanh thì tô nút đó.
5. `?limit=` vẫn trong URL (mặc định 10 bỏ khỏi URL); đổi số dòng về trang 1.
6. Số dòng gõ lớn hơn API trả: `totalPages` và "từ-đến-tổng" lấy theo dữ liệu thật của API.
7. Locale: nhãn "Số dòng mỗi trang", gợi ý "Tối đa 3000" ở 5 ngôn ngữ.

## Out of scope

Đổi API, quyền, ảo hoá dòng, trang admin.

## API and data

Không đổi. Web có thể gửi `limit` tới 3000 (zod `max(3000)` sẵn).

## Acceptance

- [ ] Test mô hình thuần (đỏ trước, xanh sau) + `locales-valid-json`
- [ ] Kiểm tay bằng Chrome có đầu với 3000 bản ghi
- [ ] Chuỗi mới đủ 5 locale
