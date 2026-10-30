# Plan — Hiện ghi chú đơn trên ảnh chia sẻ (API + web)

Issue: #1344 · Status: in-progress · Spec: ./spec.md

## Steps (api-route-standard, api-compat-review, i18n-keys)

1. `.agent/api-changes/LOG.md`: dòng `planned` (commit đầu).
2. Test đỏ: `tests/api/merchant-share-order-note-setting.test.ts`, `tests/web-settings-share-note.test.ts`.
3. `apps/api/lib/share-order-note-settings.ts` (`readShareOrderNote`), `apps/api/app/api/settings/merchant/route.ts` (kiểm tra, gộp `settings`, trả `shareOrderNote`), `apps/api/app/api/users/profile/route.ts`.
4. `packages/utils/src/api/booking-requests.ts` `setShareOrderNote` (cạnh `setBlockPricingOldApps`).
5. `apps/client/app/settings/settings-model.ts` (`shareOrderNoteFlag`, `canChangeShareOrderNote`), `sections.tsx` (`ReceiptSection` nhận `shareOrderNote`, `canEditShareOrderNote`, `onShareOrderNoteChanged`), `SettingsPanel.tsx` (nối, tải profile khi chưa biết ở tab `receipt`).
6. `locales/{en,vi,ja,ko,zh}/settings.json` `web.printer.shareNote*`.
7. e2e API `SS-SHN-01/02` trong `settings-sync.e2e.test.js`.
8. Chrome có đầu, ảnh trong `~/AnyRent-builds/e2e-sharenote-shots/`.

## Verify

`cd tests && npx jest api/merchant-share-order-note-setting web-settings-share-note web-settings-model locales-valid-json` (TZ=UTC và TZ=Asia/Ho_Chi_Minh),
`npx tsc --noEmit -p apps/api/tsconfig.json` (nền ~203) và `-p apps/client/tsconfig.json` (nền ~164), eslint file sửa.

## Risks

- Một route khác ghi đè cả `settings` làm mất khoá: chỉ có deposit (`mergePaymentSettings`, giữ khoá lạ) và `blockPricing` (gộp); có test.
- Hai request PUT khác khoá cùng lúc là đọc-sửa-ghi (như `blockPricing`): chấp nhận, chủ shop thao tác tay.

## Rollback

Revert PR; khoá thừa trong `settings` vô hại.
