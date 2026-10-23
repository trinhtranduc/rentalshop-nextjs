# E2e Hiện giá trên trang shop

Issue: #1177 · Author: agent · Status: accepted · Created: 2026-10-23

## Problem

#1174 shipped the “Hiện giá trên trang shop” switch. Turning it off on production showed `BUSINESS_NAME_REQUIRED` / “Business name is required”. Headed e2e on the #1174 code proved the client sends only `{ showPublicPrice: false }` and the API returns 200; the public catalogue then shows “Liên hệ”. That path was not in WEB-UI-SET, so a regression would not fail CI/local settings e2e.

## Proposed outcome

`scripts/e2e/web-e2e.sh --headed --ui settings` with `WEB_E2E_CASES=WEB-UI-SET-11` logs in as MERCHANT, toggles the switch off and on, asserts PUT body/status, and checks the public shop page (money vs “Liên hệ”). The flag is restored. SET-01 also opens the “Trang shop công khai” tab.

## Affected users and systems

- MERCHANT (settings). Guests on `/{tenantKey}/products`.
- Tests only: `tests/e2e/web`. No app, API, iOS, or Android change.

## Constraints

- PR targets `dev`. Do not mix `feat/984-signup-demo-vietnamese`.
- Restore `showPublicPrice`. Headed Chrome, slow steps.
- No production commands. No CMS. No API shape change.

## Open questions

None — the headed run already passed 10/10 locally.

## Decision log

- 2026-10-23 — e2e only, no app patch: local #1174 API already accepts the setting-only PUT (human asked for a PR after the e2e).
