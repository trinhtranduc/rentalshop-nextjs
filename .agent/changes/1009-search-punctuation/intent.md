# Product search finds words after punctuation

Issue: #1009 · Author: agent · Status: in-progress · Created: 2026-10-17

## Problem

Product search only treats a space as a word start. "Mẫu (Xanh Ngọc)" is not found by "xanh ngọc", because "xanh" follows "(". A query typed with punctuation ("(xanh", "ngọc)") also finds nothing. User `%` / `_` act as LIKE wildcards.

## Proposed outcome

A word start is the start of the value or any spot after a space or punctuation. Punctuation in the query splits words like a space. "xanh", "Xanh ngọc", "(xanh", "ngọc)" all find "Mẫu (Xanh Ngọc)". `%` / `_` are literal.

## Affected users and systems

Every role that searches products: client web, admin, iOS, Android, the public product page. API only (`packages/database/src/product.ts`). No response change.

## Constraints

- Keep: accent rule by query word, case-insensitive, AND across words, name OR description, merchant scope, barcode exact match, no mid-word match.
- Parameterized SQL only. No migration.

## Open questions

- none

## Decision log

- 2026-10-17 — separators are an explicit character list shared by the JS split and the SQL `regexp_replace`, not `[^[:alnum:]]`, because POSIX classes in a C-ctype database do not count Vietnamese letters as letters (agent)
