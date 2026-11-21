# Plan — Thanh toán gói trên web qua Polar

Issue: #1631 · Status: in-progress · Spec: ./spec.md

## Steps

1. Red tests, own commit: `tests/polar-billing.test.ts` (spec 1, 5–13, 16), credit cases for POLAR in
   `tests/plan-renewal-credit.test.ts` (14), status channel (15). LOG row in `.agent/api-changes/LOG.md`.
2. `apps/api/lib/plan-renewal.ts`: `BillingChannel` + `POLAR`, `normaliseChannel`, `isAutoBilledChannel` for the credit
   helpers; `RenewalInput.deviceStore` accepts `POLAR`. `plan-renewal-history.ts`: "Polar" texts.
3. `apps/api/lib/polar.ts`: config (`POLAR_*`), product map, REST client (products, checkouts, customer sessions),
   signature check. `apps/api/lib/polar-billing.ts`: pure event → row patch, order → payment, refund patch.
4. Routes: `apps/api/app/api/webhooks/polar/route.ts`, `apps/api/app/api/polar/{offers,checkout,portal}/route.ts`
   (`api-route-standard`).
5. Migration `PaymentMethod` + `POLAR` (`db-migration`; drafted in the scratchpad, owner places it); `admin-revenue.ts`.
6. Web: `packages/utils/src/api/polar.ts` (`polarApi`), `/plans` page, Cài đặt → Gói dịch vụ channel + portal, expiry
   bar; strings in 12 locales (`i18n-keys`).
7. `AnyRentSubscriptions.storekit`: the 4 card prices (test file only).
8. Verify (`verify-change`): Jest TZ=UTC and TZ=Asia/Ho_Chi_Minh, `tsc` for api and client vs `origin/dev`, eslint on
   changed files; e2e (`scripts/polar-e2e/`, fake Polar + headed Chrome) for cases 1 and 3, the refusal for a store shop,
   and Polar off.

## Files

- `apps/api/lib/plan-renewal.ts`, `plan-renewal-history.ts`, `admin-revenue.ts` — channel POLAR
- `apps/api/lib/polar.ts`, `polar-billing.ts` — new
- `apps/api/app/api/webhooks/polar/route.ts`, `apps/api/app/api/polar/*/route.ts` — new
- `prisma/schema.prisma`, `prisma/migrations/<new>/migration.sql` — enum value
- `packages/utils/src/api/polar.ts`, `apps/client/app/plans/*`, `apps/client/app/settings/*`, expiry bar — web
- `locales/*/` — strings

## Risks

- Webhook mistakes change paid plans: pure functions tested per case; events are idempotent and ordered.
- Polar disables an endpoint after 10 failures in a row: ignored events answer 200; only processing errors 500.
- A shop could pay on two channels: checkout refuses when a store or Polar auto-renews; apps already refuse when Polar
  auto-renews.
- Migration: `ALTER TYPE … ADD VALUE` (additive; old code never writes `POLAR`).

## Rollback

Revert the PR; unset `POLAR_*` turns the web back to Lemon without a deploy. The enum value stays (harmless).
