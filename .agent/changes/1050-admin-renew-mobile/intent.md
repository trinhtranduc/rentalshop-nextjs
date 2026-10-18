# Admin on a phone: renew / change plan without losing the confirm button

Issue: #1050 · Author: agent (for Trinh Tran) · Status: in-progress · Created: 2026-10-18

## Problem

The owner, on a phone: "khi bấm gia hạn thì đổi plan thì không tìm được button". In admin → Merchant →
Current Subscription, the Extend Plan and Change Plan dialogs are full screen below 768 px with a footer at the
bottom (`100dvh`). Two things hide or mute the confirm button:

1. The dialog height is `100dvh`. Safari iOS and Chrome Android do not shrink `dvh` when the on-screen keyboard
   opens; only `visualViewport` shrinks. Typing the last field (transaction ID, price, note) puts the footer under
   the keyboard.
2. Change Plan keeps its button disabled until a payment method and transaction ID are filled. Those two fields are
   at the end of the scrolled body, so the user sees a faded button and no reason.

## Proposed outcome

Below 768 px the dialog follows the visible viewport, so the footer sits above the keyboard and the confirm button
is always on screen. A disabled Change Plan button says what is missing. Desktop does not change.

## Affected users and systems

`ADMIN` on a phone browser. `apps/admin` through `packages/ui` (Subscriptions dialogs, MerchantPlanManagement).
No API, no data, no mobile app.

## Constraints

- UI only; the same requests go to the API.
- Desktop (≥ 768 px) unchanged. Other users of `ResponsiveDialogFooter` (CollectionReturnModal) unchanged.
- Keep it small (owner: "đơn giản và chuẩn").

## Decision log

- 2026-10-18 — follow `visualViewport` with two CSS variables instead of a new dialog component (agent).
