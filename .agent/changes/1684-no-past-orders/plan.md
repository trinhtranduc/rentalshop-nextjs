# Plan #1684

PR 1 (API + web, nhánh `feat/1684-no-past-orders`):
1. Test đỏ: `POST /api/orders` có/không capability `no-past-orders` (hôm qua, hôm nay, ngày mai, 17:30 UTC hôm qua = 00:30 VN hôm nay, đơn bán); `PUT` không đổi. Chạy `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
2. `apps/api/app/api/orders/route.ts`: kiểm tra sau `orderCreateSchema` và `normalizeLegacyPlanDays`, dùng `getLocalDateKey` (`timezone-dates`). Golden test `tests/api-compat/*` giữ xanh.
3. `packages/utils/src/core/client-capabilities.ts` thêm `no-past-orders`; test danh sách capability.
4. Web: `checkDays` + `DaysDialog` + mặc định ngày + bắt lỗi (`apps/client/app/orders/create`), test model.
5. i18n 12 ngôn ngữ, dòng `LOG.md`, `api-compat-review` trong PR (app cũ không gửi capability: `DepositPlan.swift:21`, `DepositPlan.kt:27` trên `main-real`).

PR 2 (iOS + Android, một PR nhiều commit): iOS trước, Android theo; `mobile-parity`; test đơn vị cho "ngày VN hôm nay" và token; build mới.

Chạy thử có cửa sổ: web bằng Chrome có giao diện, iOS Simulator, Android emulator (`show-test-runs-visibly`).
