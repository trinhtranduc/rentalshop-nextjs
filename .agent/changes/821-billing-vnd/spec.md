# Spec #821

- Migration `20261011160000_billing_currency_vnd`: UPDATE Plan/Subscription/Payment từ USD sang VND khi giá = 0 hoặc >= 1000 (cỡ VND); SET DEFAULT VND cho 3 cột; `schema.prisma` @default("VND") cho Plan, Subscription, Payment.
- Code tạo gói trial, subscription trial, seed, renew, status, plans, payments dùng VND làm mặc định.
- Admin: định dạng tiền mặc định VND; form subscription có VND (mặc định) và USD.
- Không đổi: webhook Stripe/Lemon Squeezy, `PlanStripePrice`, `PlanLemonSqueezyVariant`, `Merchant.currency`.
- Test: `tests/billing-currency-vnd.test.ts`.
