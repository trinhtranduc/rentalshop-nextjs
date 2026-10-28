# Spec

1. `tests/packages/database/product-deleted-filter.test.ts`: mock `@rentalshop/utils` thêm `foldSearchText` (cùng thân hàm với `packages/utils/src/core/string-utils.ts`). Không dùng `requireActual` vì kéo cả package utils.
2. Xoá `tests/eb-block-pricing.test.ts` (0 byte, chỉ có trong commit `0df10bc7e`, không được tham chiếu).
3. `test7qStagedDeposit`: nhãn "Đã thu N%" phụ thuộc giá thuê Product 2 do seed chung (`regenerate-entire-system-2025.js`, ngẫu nhiên 20-119), không phải `prepare-accounts.sh`. Khẳng định đổi thành `BEGINSWITH 'Đã thu '` / `'Collected '`: chỉ đổi 2 dòng, không đụng seed.

Không đổi API, không dòng `.agent/api-changes/LOG.md`.
