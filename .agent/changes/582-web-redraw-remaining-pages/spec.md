# Spec — Redraw the last old-UI pages of the shop web

Issue: #582 · Status: accepted · Intent: ./intent.md

## Behavior

Auth helper pages (dotted 4A look, `ShopAuthPage` from `@rentalshop/ui`):

1. `/forget-password` posts `authApi.requestPasswordReset(email)`; the sent card shows only when the API
   says success; an API failure shows the error above the form. "Gửi lại" returns to the form.
2. `/reset-password` without `?token` shows the invalid-link card with "Yêu cầu liên kết mới" →
   `/forget-password`. With a token it posts `authApi.resetPassword(token, password, confirm)`;
   `PASSWORD_RESET_TOKEN_INVALID|EXPIRED` and `PASSWORD_RESET_TOKEN_USED` show their messages and the
   form stays; success shows the done card and goes to `/login` after 3 s.
3. `/verify-email` keeps the `token` / `success` / `error` param handling: loading → success (to `/login`
   after 2 s) or failure (Đăng nhập · Gửi lại email → `/email-verification`).
4. `/email-verification?email=` shows the check-your-email card with the address, steps, spam hint,
   resend (`authApi.resendVerificationEmail`, 5-minute countdown, rate-limit message) and back to login.
5. All four have the brand mark, terms · privacy · language footer, and work at 390px.

`/plans` (shell, `ar-*` tokens, dark mode):

6. Title "Gói dịch vụ", the current plan line, a card per active plan with name, description, price
   `moneyText(basePrice, currency)` + "/tháng" (0 → "Miễn phí"), "Đang dùng" tag on the current plan,
   "Phổ biến" tag on the popular one, features, limits from the plan (`limits` object or JSON string;
   -1 or null → "Không giới hạn").
7. Choosing a plan shows the billing cycle (tháng / quý / năm) with the estimate (×1, ×3, ×12 × 0.9); "Thanh
   toán" opens a confirm dialog with the same estimate; "Thanh toán" there calls
   `lemonsqueezyApi.createSubscriptionCheckout({ planId, billingInterval, successUrl, cancelUrl })` and
   redirects to the returned URL, same as today.

Affiliate (public layout, landing look):

8. `/affiliate` and `/affiliate/guide` use `PublicSiteHeader` / `PublicSiteFooter`.
9. The guide renders `examples.note` with `t.rich` and a `strong` renderer: no IntlError.
10. Signed-in visitors with a referral code see their link with Copy on the guide (unchanged rule).
11. Hard-coded strings move to `affiliate.json` (en, vi — the only locales with that namespace); stale
    navigation copy points to Cài đặt cửa hàng → Chia sẻ cửa hàng → Link giới thiệu.

## Out of scope

Gating `/plans` behind `SUBSCRIPTION_UPGRADE_EXTEND_ENABLED`; SePay QR on `/plans`; changing commission
claims; `packages/ui` forms (admin still uses them).

## API and data

None. Reads `GET /api/plans`, `GET /api/subscriptions/status`; posts the same auth / Lemon endpoints.

## Acceptance

- [ ] `tests/web-plans-model.test.ts` green under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [ ] New strings in `auth.json` and `plans.json` for en, vi, ja, ko, zh; `affiliate.json` for en, vi
- [ ] Screens at 1440 / 390, `/plans` dark; 0 page errors
