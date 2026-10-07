# Tổng quan redesign — chart tiles, detail drawer, less text

Issue: #604 · Author: Claude (for Trinh Tran) · Status: approved · Created: 2026-10-07

## Problem

The shop web Tổng quan reads like a report: KPI cards with hint lines, three money cards of line
items, a text list for today's work and long date sentences per order. The owner finds it hard to scan
("hơi khó nhìn do nhiều chữ") and wants charts on the main view and the detail one click away.

## Proposed outcome

The main view shows numbers and small charts only; each money number opens a drawer with the
breakdown as a chart. Mockup approved ("chốt"): https://claude.ai/artifact/QsveMtPBZXksJGt9Gb8MFK
(source: scratchpad `money-canvas/project/Main.dc.html`, `Detail.dc.html`, `Dark.dc.html`).

## Affected users and systems

MERCHANT, OUTLET_ADMIN (money tiles + drawers), OUTLET_STAFF (today's work and orders only, as now).
`apps/client` only. Data: `GET /api/analytics/period`, `GET /api/analytics/outlet-operations` (unchanged).

## Constraints

- No API, package, Prisma or mobile change → no mobile parity, no API-compat table.
- Period control and its URL (`period`, `from`, `to`) unchanged. New `detail` param only.
- Vietnam civil days; pure logic tested under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
- No invented numbers: no sparkline or split where the API has no series/split.

## Open questions

- None blocking. Rent/sale split and per-day series for order value, outstanding and collateral do
  not exist in the period report; those parts are left out (a later API change could add them).

## Decision log

- 2026-10-07 — Mockup approved by the owner ("chốt").
- 2026-10-07 — Sparklines only on tiles with a matching per-day series (Thực thu). Giá trị đơn mới drawer: count + value.
- 2026-10-07 — "Dự kiến thu" (owner liked it): the chart and the Thực thu tile accept an optional per-day `forecast`
  (hatched segment, legend, tile bar only when present; dashed "Hôm nay" marker when the range has today). The API
  sends none yet; feeding it is a separate issue with an additive field and an api-compat review.
