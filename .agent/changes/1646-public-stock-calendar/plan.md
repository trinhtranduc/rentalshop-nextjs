# Plan #1646

Status: in-progress. Skills: `api-compat-review`, `db-migration`, `i18n-keys`, `api-route-standard`, `timezone-dates`.

1. `prisma/schema.prisma`: `showPublicStock Boolean @default(false)` trên `Merchant`. SQL nháp `migration.sql` trong thư mục này (`ALTER TABLE "Merchant" ADD COLUMN "showPublicStock" BOOLEAN NOT NULL DEFAULT false;`), owner đặt vào `prisma/migrations/`.
2. `apps/api/app/api/settings/merchant/route.ts` + `users/profile/route.ts`: nhận / trả `showPublicStock`.
3. `apps/api/lib/booking-requests.ts`: `publicDayStatuses(days, today, { withCounts })` thêm `available`; `loadBookingShop` KHÔNG đổi (đọc cột trong try riêng).
4. `public/[tenantKey]/availability/route.ts`: đọc công tắc (try riêng, lỗi = tắt), truyền `withCounts`.
5. `public/[tenantKey]/products/route.ts`: `merchant.showPublicStock` (try riêng).
6. `packages/utils/src/api/public-booking.ts`: kiểu `available?`.
7. Web: `lib/booking.ts` (`stockByDate`, `stockLevel`, `rangeStockNotes`), `BookingPicker.tsx` (tải, ô ngày, chú giải, dòng báo), nối `showStock` từ `page.tsx` → `PublicProductGrid` → `PublicProductSheet` → `BookingPicker`; `settings-model.ts`, `sections.tsx`, `SettingsPanel.tsx`.
8. Locales ×12: `settings.json` (`publicPage.showStock…`), `products.json` (`public.booking.stock…`).
9. Tests: `tests/api/booking-request-rules.test.ts` (counts), route tests, `tests/public-booking-stock.test.ts` (lib), settings model; locales.
10. LOG #1646 `planned`. Verify: tsc client/api so với baseline, jest TZ=UTC và Asia/Ho_Chi_Minh, e2e thật (Chrome mở): bật công tắc ở Cài đặt, mở trang shop, lịch có số, ngày hết, đổi chi nhánh, tắt thì mất số.
