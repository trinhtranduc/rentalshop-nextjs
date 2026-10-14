# Plan — Online booking from the public product link

Issue: #974 · Status: ready (waiting for the owner's go) · Spec: ./spec.md

Ship as small PRs in this order; each PR has its own tests and visible check. Each PR into `dev`, body in
Vietnamese, `Refs #974` (last one `Fixes #974`).

## PR 1 — API + data (no UI)

1. Failing tests first (commit before code):
   - unit: request validation (days, phone, items), line amounts DAILY vs FIXED, default pricing pick, expiry rule
     at VN day boundary, rate-limit counter.
   - route tests (`tests/api/booking-*.test.ts`, mocked db): public submit order of checks (disabled → 403, foreign
     outlet → 404, out of stock → 409 nothing stored, success 201 minimal body), shop list/detail/check/reject
     scope by role, `POST /api/orders` with `bookingRequestId` (one order per request; 409 on second confirm; no
     order on 409), notification data all strings.
2. Migration `prisma/migrations/<ts>_online_booking/` (after the latest folder on dev): `BookingRequest`,
   `BookingRequestItem`, `Merchant.onlineBookingEnabled`. Additive only.
3. `packages/database/src/booking-request.ts` (create with snapshot, list with lazy expiry, detail, reject, confirm
   inside the order transaction, pending count).
4. Routes (`api-route-standard`): `apps/api/app/api/public/[tenantKey]/booking-requests/route.ts`,
   `apps/api/app/api/booking-requests/{route.ts,count/route.ts,[id]/route.ts,[id]/check/route.ts,[id]/reject/route.ts}`;
   public products route: `outletId` filter + `defaultPricing`; `POST /api/orders`: `bookingRequestId`; merchant
   setting on the existing merchant settings route (MERCHANT only).
5. Availability via `apps/api/lib/availability.ts` / schedule-conflict helpers (same rules as order create).
6. Push via `apps/api/lib/push-notifications.ts` (type `BOOKING_REQUEST`, string data).
7. Rate limit: reuse the existing limiter in `apps/api/lib` if suitable (check `password-login.ts`); else a small
   DB-backed counter on `BookingRequest` (count by ip / phone in window).
8. Error codes in `locales/{en,vi,ja,ko,zh}/errors.json`.
9. API compat (`api-compat-review`) vs `release-2026-10-12.2` and `origin/main-real`: LOG row; PR compat table;
   how old apps list/open a `BOOKING_REQUEST` notification (file:line).
10. Business e2e `tests/e2e/business/online-booking.e2e.test.js`: setting off → 403; submit ok; out of stock → 409;
    rate limit; shop list/detail/check; reject; confirm via `POST /api/orders` → order RESERVED, request CONFIRMED;
    second confirm → 409; expiry after pickup day; both TZ.

## PR 2 — Public page (web)

Branch picker, `?outlet=`, product filter, default price label, booking cart (phone sheet + desktop panel),
submit, out-of-stock and success states, setting off = view only. Tests for cart model (amounts, days, validation,
localStorage). Headed Chrome phone (390px) + desktop (1280px).

## PR 3 — Shop web

Đơn hàng › Chờ xác nhận (list + detail split), ↻ Kiểm lại, reject dialog, confirm → create-order form pre-filled
(+ "Thay bằng yêu cầu này?"), Zalo templates, Cài đặt cửa hàng → Đặt hàng online (toggle + link), menu badge.
Headed Chrome as MERCHANT and OUTLET_ADMIN.

## PR 4 — iOS, PR 5 — Android (Android follows iOS)

Chờ xác nhận segment + Home / Việc cần làm hint, request detail (+ pull-to-refresh, ↻), reject sheet, confirm →
cart pre-filled (replace prompt), success + Zalo, push/inbox routing for `BOOKING_REQUEST`, settings toggle + link.
Unit tests for mapping and amounts; visible Simulator / emulator runs against a local API.

## Verify (each PR)

tsc (no new errors vs dev), lint clean on changed files, builds; jest both TZ; business e2e both TZ (PR 1 and any
API change); visible checks as listed; screenshots in the PR.

## Risks

- Spam / fake requests (no deposit): rate limits + phone required + "Hết hạn"; no stock is held.
- Stock changes between submit and confirm: re-check on open, on ↻, and inside order create.
- Two staff confirming: guarded in the order transaction (status + unique orderId).
- Old apps and a new push type: string-only data, no `orderId`; verified against release tags.
- Public route abuse / tenant leaks: tenantKey + outlet ownership checks; minimal response.

## Rollback

Revert the PRs; tables stay (additive). With the setting off nothing is visible.
