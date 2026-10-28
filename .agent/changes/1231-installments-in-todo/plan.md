# Plan: giai đoạn cọc trong To do

Issue: #1231 · Status: in-progress · Skills: mobile-parity, timezone-dates, i18n-keys, api-compat-review (không đổi API)

1. Test đỏ: `tests/web-overview-model.test.ts` (buildTodayRows), `OrdersHomeTests.swift`, `OrdersHomeTest.kt`.
2. Web: `dashboard/overview-model.ts` (hàng `installment`), `overview/sections.tsx`, `installments/InstallmentReminders.tsx` (chỉ "Sắp đến hạn"), locales en/vi.
3. iOS: `Model/TodayWork.swift`, `ViewModels/OrdersHomeViewModel.swift`, `OrderRowCell.swift`, `OrdersViewController.swift`, strings en/vi-VN.
4. Android: `TodayWorkModels.kt`, `DefaultTodayWorkRepository.kt`, `OrdersHomeViewModel.kt`, `OrdersBoardLogic.kt`, `OrdersHomeScreen.kt`, strings en/vi.
5. Verify: jest (TZ=UTC và Asia/Ho_Chi_Minh), xcodebuild test, gradle testDebugUnitTest, kiểm bằng mắt trên API local 3320.
