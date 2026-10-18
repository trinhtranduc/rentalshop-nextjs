# Success responses must not carry the error sentence

Issue: #1013 · Author: Claude (agent) · Status: approved · Created: 2026-10-17

## Problem

Release review #999 / #998: on `dev`, `ResponseBuilder.success()` / `paginated()` resolve `message` with the
error resolver. A success code missing from `locales/{en,vi}/errors.json` and the legacy tables gets the generic
error sentence ("Đã có lỗi. Vui lòng thử lại."). HTTP 200, `success: true`, but the text says it failed.
~127 literal success codes are missing. 17 golden assertions fail on this.

## Proposed outcome

No success response ever carries the generic error sentence, in `en` or `vi`. Status, `success`, `code`,
`data`, `meta` unchanged.

## Affected users and systems

Every role; `api` (all success responses). Clients only see `message` text change on success.

## Constraints

- Small and central: resolver + `response-builder.ts` + catalogs + tests. #985 WIP may overlap.
- Additive only for installed apps (`api-compat-review`).
- Golden tests: allowances only for the 8 intended diffs listed in the #999 review and the success `message`
  text of the income scenarios, each checked against the exact catalog sentence.

## Decision log

- 2026-10-17 — success fallback = catalog → legacy `SUCCESS_MESSAGES` → neutral success sentence (not the raw
  code as on main-real), per the #999 review recommendation (agent; owner to confirm in PR review).
