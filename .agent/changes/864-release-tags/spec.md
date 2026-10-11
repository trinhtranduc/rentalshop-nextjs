# Spec
- Tag name `release-YYYY-MM-DD` (Vietnam day of the deploy); `.2`, `.3` for later deploys that day (hotfixes).
- Annotated tag on the main-real head after each push, plus a GitHub Release with notes since the previous tag. A commit already tagged is skipped.
- Past deploys tagged by hand: release-2026-10-03 (#358), .2 (#360), .3 (#366), release-2026-10-07 (#650), release-2026-10-11 (#772).
- `api-compat-review`, `release-review`, `review-pr`, AGENTS.md compare against the latest `release-*` tag and name it.
