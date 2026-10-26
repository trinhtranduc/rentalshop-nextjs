# Admin dashboard full merchant totals

Issue: #1192 · Author: owner · Status: accepted · Created: 2026-10-24

## Problem

#1191 shipped only the first #1190 commit. Production still shows **Active 23** (paid enum) with Basic/Pro among those paid shops (13 and 9). That looks like “every shop”. Expired, cancelled, trial, and inactive shops vanish from those clicks. The Merchants tile uses analytics `isActive: true`, not the unfiltered list. The owner needs complete figures: tổng, còn hạn, hết hạn, and full plan counts.

## Proposed outcome

- **Merchants** = every shop. Number is `GET /api/merchants` with no status/plan. Click opens `/merchants`. Basic / Pro / Enterprise chips on this tile count **all** shops on that plan and open `/merchants?plan=Basic|Professional|Enterprise`.
- **In use** = còn hạn (`status=current`: period not ended, not cancelled/paused). No plan chips on this tile.
- **Expired** = hết hạn (`status=expired`).
- Trial / Expiring / Cancelled stay. Each tile number equals the list `total` for the same query.
- Headed e2e clicks each tile/chip.

## Affected users and systems

Roles: `ADMIN` / `OPS`. Apps: `admin`, `packages/database` (list filters), `packages/ui` (filters + testids). Installed POS does not call `GET /api/merchants`.

## Constraints

- Dual IDs. Admin English copy. No new i18n keys.
- `status=current` is còn hạn. `status=active` (shipped yesterday as enum ACTIVE) becomes an alias of current so the old Active bookmark still lists shops that are in period.
- `plan=` without status lists every shop on that plan. Numeric `plan=<id>` unchanged.
- Do not mix #984. Target `main-real`.

## Open questions

None. Owner: thông số đầy đủ — tổng, còn hạn, hết hạn, và gói.

## Decision log

- 2026-10-24 — Plan chips move onto Merchants (all shops), not In use. In use is còn hạn only. (owner)
