# Spec — #943

A **feature add-on** is an add-on with no packs (packs = pack size = 1) and a `featureKey` from
`@rentalshop/constants` MODULES (`attendance`). It reuses every #850/#870 path (charge, renewal, extend, change-plan).

## Data (migration `20261016090000_feature_addons`, additive)

- `AddonPrice.featureKey TEXT NULL`, `PlanLimitAddon.featureKey TEXT NULL` (snapshot at purchase), index
  `PlanLimitAddon(merchantId, featureKey)`. A feature row has `limitKind = 'feature'`, `packSize = 1`.
  The five limit columns of a feature item are 0, so limit checks are unchanged.

## Rules

1. **Price list** (`POST /api/addon-prices`): `limitKind: 'feature'` needs `featureKey` in MODULES (else 400);
   `packSize` is stored as 1. A limit row cannot carry a `featureKey`. `PUT`: a feature row's pack size never changes.
2. **Buy** (`POST /api/merchants/[id]/addons`, quote): packs forced to 1. Charge now = #870 rule 10:
   `round(monthly price after cycle discount ÷ 30 × VN days left)`. Example: 99.000 ÷ 30 × 18 = **59.400**. Trial or
   ended period = 0. Payment as other add-ons (type `PLAN_CHANGE`; method `TRANSFER` default, `CASH` and `STRIPE` allowed).
   A shop that already has an un-ended item with the same `featureKey` → 422 `ADDON_FEATURE_ALREADY_ON` (5 locales).
   In the same transaction, a legacy `MerchantModule` row of that key is switched off (`enabled = false`, row kept), so
   the add-on is the only source from then on ("admin chuyển").
3. **Renew / extend / change-plan**: unchanged code; `addonRenewalLines` adds `unitPrice × 1` (renewal adds 99.000/month,
   with the cycle discount); change-plan credit counts the paid feature price for the days left (0 in trial).
4. **Turn off** = existing `PATCH { removeAtPeriodEnd: true }`: `endsAt = currentPeriodEnd`, usable until then, not
   renewed, no refund; data kept. Undo in the same period as today. `PATCH { packs }` on a feature item → 400 `INVALID_INPUT`.
5. **Price edit** applies from the next renewal (existing #850 rule 6).
6. **Module active** (`getActiveMerchantModuleKeys`, used by login / profile `merchant.modules` and the
   `MODULE_NOT_ENABLED` gate) = legacy rows (#907 rule) **or** an un-ended feature add-on (`isActive`, `endsAt` null
   or future). Same `requires` rule. Output shape unchanged.
7. `GET /api/merchants/[id]/addons` adds `legacyModules` (`[{ key, enabled, endDate, active }]`) so admin sees a shop
   still on the old switch. Old `/api/merchants/[id]/modules*` routes stay (stale admin tabs).

## Admin

- Add-on prices: kind select gets "Tính năng (bật/tắt)" + feature select (Chấm công); no pack field; table shows
  "Tính năng · Chấm công", price "/ tháng".
- Merchant → Add-on: a feature row has no "Số gói"; owned features are not offered again; "Thêm add-on" opens a
  confirm dialog with the charge (formula, days left, trial = 0), method (Chuyển khoản / Tiền mặt) and transaction id.
  A feature item shows "Tắt từ kỳ sau" (confirm dialog: usable until the period end, no refund, data kept) / "Hoàn tác".
  A line shows a legacy module still on.
- Merchant detail: the "Module" card is removed.
- Admin page strings stay Vietnamese like the other add-on pages (no i18n in admin pages); the new error code is in 5 locales.

## Out of scope

Shop self-purchase, Tính lương row, mobile apps (they read `merchant.modules`, unchanged), Stripe/Lemon line items.

## API compatibility (against `release-2026-10-12.2`)

| Area | Old callers | Verdict |
|---|---|---|
| `merchant.modules` (login / profile) | iOS/Android on the release: no attendance code | same shape, same meaning; source adds feature add-ons |
| `MODULE_NOT_ENABLED` gate | attendance routes (not on the release) | same code / status |
| `/api/addon-prices*`, `/api/merchants/[id]/addons*` | admin only; mobile none | additive: `featureKey`, `legacyModules`, `limitKind: 'feature'` value, new 422 code, `CASH` method |
| renew / extend / change-plan | admin + shop web renew | unchanged code; totals include a feature item only for shops that bought one (none before deploy) |
| Migration | — | two nullable columns + index |
