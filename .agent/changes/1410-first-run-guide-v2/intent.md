# First-run guide v2: one button on the card, harder to skip, 9 bubbles

Issue: #1410 (card), #1411 (iOS walk), #1412 (Android walk) · Author: Claude · Status: in-progress · Created: 2026-11-01

## Problem

Owner's feedback on #1393 / #1394: "ở các steps hiện user làm sao biết bấm vào từng bước" and "hiện user dễ dàng skip quá". The card has only thin rows, and Bỏ qua, or a tap on the dim, drops the guide in one touch.

## Proposed outcome

The design the owner approved: tab "★ Cầm tay: đơn đầu tiên", top section, https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4, with 9 bubbles in place of the tab's 12. The card has one blue button, Để sau only collapses it, hiding is in Settings, and each bubble has Tiếp, n/9 and Thoát hướng dẫn. The guide needs a photo and a price; the normal form does not.

## Affected users and systems

`MERCHANT` on a shop with 0 orders, on iOS and Android. No API, web or migration change.

## Constraints

- No API path changes. Normal forms keep their rules: no photo and 0đ still save outside the guide.
- Never blocks the app: Thoát hướng dẫn is always there.
- Not touched: the 3 onboarding pages, "Enjoying AnyRent?", notification prompts (owner has not decided), web.
- Strings in en and vi only. iOS is the reference; Android matches.

## Decision log

- 2026-11-01 — Three PRs, each with its own issue, because pr-governance needs a closing keyword.
- 2026-11-01 — Totals: rent 9, rent with customers 7, sale 8, sale with customers 6. Customers are read when the run starts, so the customer just created does not change the counter mid-run.
- 2026-11-01 — Bubble 6 has one text. It shows first on the customer picker, lighting Khách mới, then on the form, lighting phone and name, at the same 6/9. Without the picker half the owner has no pointer on that screen. To confirm with the owner.
