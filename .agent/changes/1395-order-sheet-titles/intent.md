# Titles on all order-detail sheets

Issue: #1395 · Author: Claude · Status: accepted · Created: 2026-10-31

## Problem

Order-detail sheets open with no title, with a title in a different size or place, or with a sentence that holds an order or stage number. Staff cannot tell at a glance which step they are in.

## Proposed outcome

Every sheet shows its approved title in one style at one position, on iOS and Android.

## Affected users and systems

All roles on iOS and Android. No API, no database.

## Constraints

UI only. Existing controls stay. No money or rule change. Old strings still used by buttons (Giao đồ, Nhận trả) stay.

## Open questions

None.

## Decision log

- 2026-10-31 — Titles approved by the owner; iOS is the reference, Android matches (owner, via coordinator).
- 2026-10-31 — The note editor's photo source menu is a system action sheet (Thư viện ảnh / Máy ảnh / Huỷ): "Ghi chú đơn" over it says nothing, so it stays without a title. Android has no menu there.
