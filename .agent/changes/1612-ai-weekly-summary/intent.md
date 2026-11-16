# AI summary of last week on Tổng quan

Issue: #1612 · Author: agent · Status: accepted · Created: 2026-11-16

## Problem

The owner wants a quick read of last week (revenue, branches, orders, rentals and returns, hot items, customers) and
what to do next, without adding up the Overview tiles by hand.

## Proposed outcome

On Tổng quan, a "✦ Tóm tắt tuần" control (app: floating button; web: button at the top) opens a sheet / side panel:
two sentences, three things to do this week, then three groups of figures (Doanh thu with each branch; Đơn hàng và
thuê – trả; Mẫu hot và khách), each with one line written by AI. Figures come from code (same rules as Overview);
AI writes only the sentences.

Mockup (approved direction 2026-11-16): https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4#aisummary

## Affected users and systems

- MERCHANT: whole shop, with the branch list when two or more branches are open.
- OUTLET_ADMIN: own branch only. OUTLET_STAFF, OUTLET_INVENTORY: no button (no full revenue permission).
- api (new route, new table `AiWeeklySummary`), client (web), iOS, Android. External: Anthropic API (Claude Haiku 5.5).

## Constraints

- One AI call per scope (shop or branch) per week (Monday..Sunday, civil days, Vietnam by default). The first open
  writes it; app and web read the same row. A failed call is not stored.
- No orders, pickups, returns or cancellations in the week: no AI call (status NO_ORDERS).
- `ANTHROPIC_API_KEY` unset: the route answers `available: false` and the apps hide the button.
- Sent to AI: figures, branch names, product names, shop type / country / city / currency. Never customer names or phones.
- Additive API: new route only. Installed apps do not call it.

## Decision log

- 2026-11-16 — Haiku 5.5 for cost (owner). One call per shop per week (owner). Branch list for the owner only; a
  branch manager gets a summary of their branch (owner).
- 2026-11-16 — App: floating button with a red dot until this week's summary is opened; web: button at the top of
  Tổng quan; sheet: three groups with the actions first (agent recommendation; owner asked to implement without
  picking other options).
