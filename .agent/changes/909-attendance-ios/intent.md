# Intent — Attendance (3/4): iOS clock in / out and my shifts

Issue: #909 · Product: #906 · Needs: #907 (API) · Status: accepted (owner go 2026-10-12)
Mockup (approved): `.agent/changes/907-attendance-api/mockup.html` on `feat/907-attendance-api`, tab "App (nhân viên)"
(https://claude.ai/artifact/MikH31P6eVqyzbnj6BoWzf)

## Problem
Staff must clock in / out by scanning the outlet's QR code with the app, and see their shifts and hours.

## Outcome (verifiable)
- Settings shows "⏱ Chấm công" as its first row only when `merchant.modules` contains `attendance`.
- One button: Vào ca when no open record, Ra ca when one is open. It opens an in-app QR camera.
- The scan sends `{ code, latitude, longitude, accuracy, isMock }` to `POST /api/attendance/punch`.
- Success and the seven rejections show the mockup copy, one error at a time.
- "Ca và công của tôi" shows this week's shifts with in–out times (late in amber) and the month totals.
- A `SHIFT_CHANGED` notification opens "Ca và công của tôi" (inbox row and push tap).

## Users and systems
OUTLET_STAFF, OUTLET_INVENTORY, OUTLET_ADMIN, MERCHANT on iOS (`apps/mobile`). API from #907. Android follows (#910).

## Constraints
- iOS is the mobile reference. Simple, as the mockup.
- Never trust the phone clock: times shown are the server's. Accuracy = `horizontalAccuracy`;
  `isMock = location.sourceInformation?.isSimulatedBySoftware ?? false`.
- Old cached profiles without `merchant.modules` = row hidden. New Codable models tolerate missing fields.
- Camera and when-in-use location with purpose strings; denied → guide to Settings.
- Simulator has no camera: manual code entry in Debug builds only.

## Open questions
- Exact JSON of `/me`, `/people/[userId]/month`, `/shifts` is not final while #907 is built. Decoding is lenient;
  checked against the real API in e2e before merge.
