# #927 intent — shop picks who must clock in (API + web)

Owner decision 13/10/26 (issue #927, mockup MikH31P6eVqyzbnj6BoWzf). Refs #906.

- **Want:** the shop chooses, per person, who must clock in. Default: `OUTLET_STAFF`, `OUTLET_INVENTORY` yes;
  `OUTLET_ADMIN`, `MERCHANT` no. Only chosen people see the app clock card, can be scheduled, and appear
  in Xếp ca / Bảng công (plus anyone with records in the period).
- **Why:** today everyone in an outlet sees the card and every outlet user is listed, the owner and outlet
  admins included.
- **Constraints:** contract in the issue is fixed (iOS / Android build against it in parallel). Additive
  only: one nullable column, null = role default, no backfill. VN days. Simple, match the mockup.
- **Scope here:** API + shop web. iOS and Android cards are separate PRs (so this PR is `Refs #927`).
