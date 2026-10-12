# Locale JSON broken by parallel PRs that append to the same file

**Seen:** 2026-10-11, twice in one day (#832/#835 after #829 + #831; #842 after #829 + #837).

**What happened:** several PRs appended error codes at the end of `locales/*/errors.json` at the same time. Git merged
them without a conflict but left a missing comma (invalid JSON in ja/ko/zh) and, the second time, the same key twice
(JSON keeps the LAST value, so en/vi silently showed the older, wrong text).

**Detect:** `cd tests && npx jest locales-valid-json` — every `locales/*/*.json` parses and no flat file has a key twice.

**Rule for agents:** after merging `dev` into a branch, or before pushing a branch that touches `locales/`, run that test.
When two PRs add codes to the same locale files, the second one to merge re-checks after merging `dev`.
