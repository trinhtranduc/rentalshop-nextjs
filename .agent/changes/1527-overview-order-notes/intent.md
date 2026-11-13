# Order notes in Tổng quan › Đơn cần làm hôm nay (web)

Issue: #1527 · Author: Claude (with the owner) · Status: in-review (PR #1528) · Created: 2026-11-12

## Problem

On the shop web, Tổng quan › "Đơn cần làm hôm nay" lists today's pickups and returns without their notes.
Staff see a note ("gọi trước 30 phút", "giữ CCCD bản gốc", "bóp eo 2 cm") only after opening each order,
so notes are missed at hand-over and return. Every shop that writes notes on orders is affected, every day.

## Proposed outcome

- A row of the card whose order has a note, or an item with a note, shows the notes under the row:
  the order note, then each item note as "<product>: <note>", each at most 2 lines.
- Rows without notes look as today.
- "+N đơn nữa" adds "· K có ghi chú" when hidden rows have notes.
- `GET /api/analytics/outlet-operations` rows carry `notes` and `items[].notes` (additive).

Mockup approved by the owner: tab "★ Tổng quan web: ghi chú trong Đơn cần làm hôm nay" on
https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4.

## Affected users and systems

- Roles: every role that sees Tổng quan (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY`).
- Apps: `api` (outlet-operations route), `packages/database` (row select), `packages/utils` (type), `client` (card).
- iOS and Android: not changed. They ignore the new keys.

## Constraints

- Additive API only; no field removed, renamed or retyped; no migration.
- Scope (merchant / outlet) and permissions of the route unchanged.
- No new card, no change to row order, period or branch behaviour.

## Open questions

- None.

## Decision log

- 2026-11-11 — First mockup (separate "Ghi chú" card) rejected: "UI chưa ổn lắm" (owner).
- 2026-11-11 — Notes go inside "Đơn cần làm hôm nay" rows: "tôi nghĩ đơn hôm nay có thể bổ sung ghi chú vào" (owner).
- 2026-11-12 — Item notes shown too; design final: "chốt" (owner). Start implementation: "có" (owner).
