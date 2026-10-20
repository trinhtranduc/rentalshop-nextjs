# Spec

- `buildPricingCards(plans, locale)` (apps/client/lib/pricing-format.ts): active plans, no Trial, sorted by `sortOrder`.
  Card: `id` (basic/professional/enterprise from the name), `name`, `isPopular`, `price` (string or null), `limits`, `web`.
  - `price`: vi and `basePrice > 0` → VND amount; otherwise null (the card shows `contactSales`, no "/month").
- API failure → `fallbackPricingCards()`: Basic/Professional/Enterprise, no price, no limits.
- Comparison table: Products/Customers/Users/Outlets/Orders and Web Dashboard rows come from the cards; rows with no API data show "—".
- Plans load server-side through `publicPlansApi.getPublicPlansWithVariants()` (already `cache: 'no-store'`, #1119) and are passed to `PricingClient`.
- Metadata titles that already end in "| AnyRent" use `title: { absolute }` (7 vi pages).
