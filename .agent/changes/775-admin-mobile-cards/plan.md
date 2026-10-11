# Plan

1. `.table-cards` CSS + pilot on `PaymentTable`; check 390 / 768 / 1280 px in a headed browser.
2. Group 1: `PaymentTable`, `BillingCycleTable`, `SubscriptionList`, `PaymentHistoryTable`, subscription `[id]` and `create` pages.
3. Group 2: `OrderTable`, customers, products lists and their `[id]` pages.
4. Group 3: `MerchantTable`, users, `system-users` page table.
5. Group 4: dashboard cards, top shops, top products.
6. Gates: lint, type-check (no new errors vs `dev`), `SKIP_ENV_VALIDATION=true yarn build`; screenshots in the PR. One PR to `dev`, one commit per group, `Fixes #775`.
