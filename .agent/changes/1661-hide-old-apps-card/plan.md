# Plan (#1661)

1. `apps/client/app/settings/SettingsPanel.tsx`: bỏ import và dòng render `BlockOldAppsSection`, bỏ `blockOldAppsFlag` / `oldAppsFlag` và điều kiện của nó trong `needsProfile`; để lại ghi chú cách bật lại.
2. `tests/web-settings-hide-old-apps.test.ts`: thẻ không còn, các thẻ khác còn, component và chuỗi còn.
3. Verify: `cd tests && TZ=UTC yarn test web-settings web-block-pricing merchant-block-pricing-setting`, lặp lại với `TZ=Asia/Ho_Chi_Minh`; `tsc` client không lỗi mới ở `settings/`.

Không đụng `apps/api`, `packages/*`, `prisma/`, iOS, Android: không cần dòng LOG.
