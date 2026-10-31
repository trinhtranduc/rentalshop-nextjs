# Spec — First-run guide

Issue: #1393, #1394 · Status: in-progress · Intent: ./intent.md

## Behavior: card (PR 1, #1393)

1. Audience: role `MERCHANT`, with both `newProducts` and `newCustomers` on, and a known shop id. Every other role, and old screens, see no card and no Settings row and make no extra call.
2. The card shows on Home when the shop has 0 orders, the guide is not skipped and not done, the product list has answered and no search is active.
3. Rows in order: product, customer, order. A row is ticked from data: product from the Home list being non-empty while not searching; customer from `GET /api/customers?limit=1` total. The count is the number of ticked rows. The current row is the first unticked one.
4. `GET /api/orders?limit=1` with no branch filter: total above 0 means done, whatever the other two say. Cancelled orders count. Once done, a per-shop local flag stops every further call.
5. Finish card "Xong đơn đầu tiên" shows once, only on a phone that showed the steps card for that shop and did not skip it. A reinstall or a second phone on a shop that already has orders sees no card and no finish card. Đóng ends it for good.
6. A network error on either read, or a Home list that failed: no card, no Settings row, no message.
7. Bỏ qua is stored per phone and per shop; another shop on the same phone still sees its card. A skipped guide makes no call from Home, and shows a toast pointing to Settings.
8. Settings row "Hướng dẫn bắt đầu" with "n/3" under Widget, only while the card would apply apart from the skip. It opens the card in a sheet with Đóng in place of Bỏ qua. Tapping a row there clears the skip, goes to Home and runs that step.
9. Row actions: product opens the product form. Customer and order open the cart, first adding the newest product when the cart is empty. With no product yet, they open the product form.

## Behavior: bubbles (PR 2, #1394)

10. 6 bubbles on 4 screens, in the order of the tab: product form (name and price), cart customer row, picker Khách mới, new customer form, cart date row, cart Tạo đơn. They start only from a card row.
11. Dim everything, light one control. Tapping the lit control acts on it. Tapping the dim area closes that bubble; the screen stays usable. Bỏ qua in a bubble skips the whole guide.
12. Anchors are `accessibilityIdentifier` / `testTag`. A missing anchor skips that bubble silently. The date bubble does not show on a sale order. iPad: card only.

## Out of scope

#984 sample data, the 3 onboarding pages, the "Đã thu cọc 0" line, web, any form's validation.

## API and data

No API change. Reads two existing routes, with existing parameters, for `MERCHANT` only:
`GET /api/orders?limit=1&page=1` and `GET /api/customers?limit=1&page=1`. New local keys only: `firstRunGuide.<state>.<merchantId>`.

## Acceptance

- [ ] Behaviors 1–9 have unit tests on both apps (`FirstRunGuideTests`, `FirstRunGuideTest`)
- [ ] Cancelled orders counted, proved against a local API
- [ ] Behaviors 10–12 walked by one UI test on each app on a new shop from the register route
- [ ] Strings in en and vi on both apps
