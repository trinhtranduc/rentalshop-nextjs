# Product form on the apps: one "Tồn và hiện ở chi nhánh" box

Issue: #1607 (also #1605) · Author: agent · Status: accepted · Created: 2026-11-16

## Problem

Seen on iOS and Android on 2026-11-16 (owner of a shop with two branches). The add / edit product form has one
"Số lượng" stepper and a separate "Hiện ở chi nhánh" box:

- The quantity always goes to the branch in use, even when that branch is unticked. Unticking Main, ticking Outlet 2,
  and setting 1 saves Main 1 (not shown there) and Outlet 2 0 (shown, out of stock).
- No reminder when the branch holding the quantity is unticked.
- Unticking every branch is only refused by the server after Save (#1603).
- "Đang chọn" next to the tick reads as "ticked".
- The ticks are sent untick first, so moving a product A → B in one save is refused (#1605).
- iOS inserts a just-saved product into Home even when the branch in use does not show it.

## Proposed outcome

Agreed with the owner on 2026-11-16 (mockup tab "Tạo sản phẩm (app): tồn theo chi nhánh", option A, edit included):

- One box "Tồn và hiện ở chi nhánh" with a row per open branch: a tick, the name, and its own quantity stepper.
  The total sits at the right of the header. The web works the same way.

## Affected users and systems

`MERCHANT` with two or more open branches (create and edit). `OUTLET_ADMIN` / `OUTLET_INVENTORY` editing a product
with rows at two or more branches (one row, dimmed tick). iOS (`apps/mobile`), Android (`apps/mobile-android`).

## Constraints

- No API change: `POST /api/products` already takes the owner's `outletStock[].isListed`; `PUT /api/products/{id}`
  takes several `outletStock` rows from the owner; ticks keep `PUT /api/products/listing`.
- A one-branch shop (Basic) and a branch role creating a product keep the single "Số lượng".
- iOS is the reference; Android matches it. New strings in 12 languages.

## Decision log

- 2026-11-16 — Option A (untick keeps the quantity, with the reminder, as on the web); edit uses the same box (owner)
