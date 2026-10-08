# Intent — Image search quality basics (server part)

Issue: #654 · Branch: `feat/654-image-search-quality` (off `dev`)

## What
Image search finds the right product more often and fails in a way the apps can show.

## Why (review 2026-10-08)
- Only the first photo of a product was indexed by the backfill, with a random point id per run, so
  re-runs piled up duplicate points and a product whose photos were all removed kept old vectors.
- A job left `RUNNING` by a restart was never retried, and nothing in the repo calls the embedding cron.
- `/embed` could wait 300 s on production while apps give up at 60–120 s (generic network error).
- `SEARCH_FAILED`, `SEARCH_TIMEOUT`, `INVALID_LIMIT`, `INVALID_MIN_SIMILARITY`, `NO_PRODUCTS_FOUND`
  had no locale text.
- The Python service logged part of the AWS secret and allowed CORS `*`.

## Constraints
- Search response shape unchanged (installed apps). Additive only.
- No migration. No production command, no production backfill.
- Mobile items (512 px query, row tap, parity) are done by the mobile part of the same issue.
