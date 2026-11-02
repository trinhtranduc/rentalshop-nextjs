# Plan: phụ phí, phần còn lại

Issue: #1442 · Status: in-progress · Spec: ./spec.md

## Steps

1. Rà soát tương thích trong issue trước khi sửa (skill `api-compat-review`). Xong, không có gì đọc tiêu đề.
2. Test fail trước: `tests/api/orders-export-header.test.ts`, một test trong `tests/phu-phi-wording.test.ts`.
3. Sửa `route.ts`, `locales/{vi,en}/orders.json`, `docs/crisp-hugo-anyrent.md`, `LOG.md`.
4. Jest dưới `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` so với base, `locales-valid-json`, type-check API.
5. Xuất file từ API local, DB Homebrew riêng, mở file kiểm tiêu đề.

## Rollback

Revert PR. Không có dữ liệu cần hoàn tác.
