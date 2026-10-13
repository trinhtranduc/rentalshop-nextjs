# #938 — calendar today lists late returns; held-collateral count and list agree

## What
1. Calendar (iOS, Android): on **today**, the day list also shows the rentals still out past their return day,
   as the web does (`apps/client/app/calendar/page.tsx` `useLateReturns` + `mergeReturns`). Header "N trễ" = late rows.
2. Overview Thế chân tile (iOS, Android, web): the chip "đang giữ N đơn" counts only rentals out **with collateral**
   (`cash.collateralToReturn.orders`), and "Xem các đơn liên quan" lists those held orders plus the period's
   collateral in/out rows, so a chip > 0 never opens an empty list.

## Why
Owner report, confirmed by e2e (`/private/tmp/claude-billing/latehold-shots/`): "4 trễ" with no late row in the list;
"đang giữ 4 đơn" and a related list saying "Không có đơn nào trong kỳ".

## Constraints
- UI stays as today (owner, 2026-10-13): logic and data only, existing row styles.
- Vietnam civil day (`timezone-dates`). Never change `depositsHeld` (old apps read it); additive API only.
