# Attendance module (2/4): shop web screens

Issue: #908 (part of #906) · Author: Trinh Tran (agent draft) · Status: in-progress · Created: 2026-10-12

## Problem

#907 adds the attendance API (QR punch, shifts, timesheet). The shop owner and the outlet admin still have
no screen to set an outlet's location and QR code, build the weekly schedule, read the monthly timesheet,
or fix a forgotten clock-out.

## Proposed outcome

In `apps/client`, only when `merchant.modules` contains `attendance`:

- Menu **Chấm công** (MERCHANT, OUTLET_ADMIN; never OUTLET_STAFF / OUTLET_INVENTORY) with four tabs:
  Bảng công, Chi tiết theo người, Xếp ca, Mẫu ca — exactly the "Web" part of the approved mockup
  (`.agent/changes/907-attendance-api/mockup.html`).
- **Chi nhánh** list gets a "Chấm công" column and "Mở ›" to the outlet's attendance page (location, radius,
  QR code, print, kiosk link). OUTLET_ADMIN sees the Chi nhánh menu (own outlet) while the module is on.
- Public page `/kiosk/qr/<token>` (no login) shows the outlet's QR, name, help text and last 5 punches,
  refreshing itself.

## Affected users and systems

MERCHANT, OUTLET_ADMIN (web). `apps/client`, `packages/utils` (`attendanceApi`), `packages/types`
(attendance types), `locales/*` (new keys). API of #907 only; no API change.

## Constraints

- Calls through `attendanceApi` / `authenticatedFetch` (kiosk: `publicFetch` + `X-Kiosk-Token`).
- Vietnam civil days for "today", month and week grids, locks and the record times typed in dialogs.
- Five locales. Simple: what the mockup shows, nothing more.

## Open questions (defaults from the issue)

- "Lấy lại từ địa chỉ" needs geocoding: dropped. Location = "Vị trí hiện tại" or pick on the map
  (Leaflet + OpenStreetMap tiles; the repo had no map library).
- "Vắng": a past scheduled shift with no hours shows grey "Vắng" in the month grid (from `/shifts` + timesheet).

## Decision log

- 2026-10-12 — owner go for #908, parallel with #907/#909/#910 (Trinh Tran)
