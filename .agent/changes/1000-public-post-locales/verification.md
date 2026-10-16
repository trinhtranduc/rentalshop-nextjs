# Verification and release review — #1000

Review date: 2026-10-16. Base: origin/main-real f890aef9e; latest customer release tag: release-2026-10-12.2. Isolated branch intentionally targets main-real at owner request; unrelated dev release #999 is not included. No production deployment or merge performed.

## Verdict

**NO-GO for production merge; draft ready for owner UI review.** The new migration has applied locally, but not on dev; CMS create/edit/translation flow has not had a headed end-to-end run against the updated API. Whole-repo gates remain red on the production baseline as detailed below. Human schema/governance review remains required. Never treat a preview as proof that the production API already accepts all locales.

## Proof

- `yarn install --frozen-lockfile`: passed; no lockfile change.
- `yarn db:generate`: passed.
- `TZ=UTC yarn --cwd tests test public-post-locales post-translations public-post-visibility post-api-locale-query public-post-body locales-valid-json web-landing-middleware --runInBand`: **7 suites, 209 tests passed**.
- Same focused command with `TZ=Asia/Ho_Chi_Minh`: **7 suites, 209 tests passed**.
- Covered: 12 language validation, default vi, protected-route boundaries, actual Next 14 matcher compilation, prefix-free Vietnamese paths and query-preserving aliases, exact-language lookup without fallback, published-only alternates, independent DB edition updates, unique group/language, CMS locale query, dictionary parity, server-rendered text/images and unsafe URL rejection.
- `SKIP_ENV_VALIDATION=true yarn workspace @rentalshop/client build`: passed (21.81s).
- `SKIP_ENV_VALIDATION=true yarn workspace @rentalshop/admin build`: passed (16.85s).
- `yarn type-check`: **285 diagnostics on both head and main-real**, identical normalized diagnostics; none added by this change. Existing database post-tag slug, vitest, UI and test type errors remain.
- `yarn lint`, `SKIP_ENV_VALIDATION=true yarn build`: Turbo stops before tasks with `Failed to create APIClient: Unable to set up TLS / No keychain is available`; same on baseline.
- Direct client lint: 39 normalized errors versus 40 on main-real; direct admin lint: 256 versus 256. No new normalized lint error. New image rendering emits Next img optimization warnings.
- Direct API build: cannot resolve prebuilt `@rentalshop/utils` artifacts, identical failure on main-real; API build not certified green.
- Full Jest under UTC and Vietnam timezone: both baseline and head fail the revenue-calculator / availability suites and terminate from railway-deployment.test.js process.exit(1); no full-suite pass claimed. Focused tests above complete independently.
- Eval controls checked: locale JSON duplicate/parse suite green; issue and API compatibility log included (#606); explicit test workdir eval included after repeated agent command error.

## Visible browser / HTTP checks

Headed Cốc Cốc: Vietnamese landing at `/`, open twelve-language menu, click Русский → `/ru`, translated copy/nav visible; Vietnamese published post at `/post/anyrent-phan-mem-quan-ly-cua-hang-cho-thue` displays article and hosted images. Local preview reads only the already-public production article; no fixture post is written to production.

HTTP: `/` vi and `/ru`, `/en`, `/zh-TW` own document lang after fixing the Next matcher; canonical points at own language. Vietnamese article is in initial server HTML. Missing Russian edition returns 404 rather than Vietnamese fallback. `/vi/post/<slug>?test=1` returns 308 to `/post/<slug>?test=1`. Unknown language invokes Next notFound/noindex (streamed response can be HTTP 200).

## Migration and compatibility

`20261016025148_post_translation_group`: one nullable TEXT column and unique (translationKey,locale); no old migrations modified. Existing rows are NULL so the new index permits them; old API ignores the new column. Locally applied via Prisma migrate dev using a clean baseline sandbox, with SHA-256 equal to the checked-in SQL (8738e7b3e1aae8f1e4ba62ff5d8b84a3be0b04d73ff492ac7d3e55e2ca27591e). Historical repo migrations cannot initialize an empty shadow DB (`20241130094100_add_bank_account_model` references missing Outlet); old files preserved. This is local SQL/application proof, not proof of complete migration history or a dev deploy.

No installed iOS/Android post callers on main-real or release-2026-10-12.2 (`git grep -E '/api/posts|posts/slug'`). Old web callers: packages/utils/src/api/posts.ts:38,62,70,82. Old fields/default vi and permissions retained; new source ID and translation metadata optional. No order/auth/payment behavior, mobile version minimum or mobile feature configuration change. No new required environment variable. Existing CLIENT_URL controls preview/canonical host.

## Before merge

- Verify migration on dev and the updated API, including CMS ARTICLE create/edit/locale change, independent translations and draft visibility in a headed browser.
- Review the schema and AGENTS workdir guard; back up production DB.
- Deploy API/migration before depending on new language filters in web/admin. Old API still rejects ru, zh-TW, fr, de, th, id, es; new web renders a localized error in that rollout window instead of falling back.
- Human owns merge/deploy and watches migration logs and API health. Existing stale clients keep prior contracts. Roll back by reverting merge; leave additive nullable column/index in place.

## Content status

Owner separately authorized publishing the demo using existing CMS endpoints; published Vietnamese post ID 29 with six permanent media/blog assets, verified via public API and headed production page. Eleven translated versions have not been created or published; seven new languages are rejected by the currently deployed API. This PR enables their CMS creation and linking, it does not fabricate translated content.
