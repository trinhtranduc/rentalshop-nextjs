# Plan

Issue: #1000 · Status: review-ready (release blocked)

1. Capture scope and issue-time API impact (#1000), branch from origin/dev. Read api-route-standard, i18n-keys, api-compat-review, db-migration, protocol-guardian, verify-change and React best practices.
2. Add public locale registry in packages/constants and Post locale types/validation/client filtering, preserving old defaults. Add planned API LOG row.
3. Add nullable translationKey/index to Post through locally generated migration. Add transactional source-based edition creation, independent edits and published sibling lookup to packages/database/src/post.ts and post route responses. No native post callers found on main-real; no mobile decoder change needed.
4. Admin posts list/form/detail/create/edit: locale filter, persisted language, source edition creation, correct preview links and translations. Shared UI PostForm/PostCard only changes needed for this flow.
5. Public-only dictionaries in locales/<locale>/public.json; localized layout/landing/list/detail, reusable public components and exact-locale fetch. Update public route classification and root document language for these paths without broadening protected-route access. Keep legacy cookie/POS localization intact.
6. Apply owner clarification: prefix-free Vietnamese landing and posts, permanent /vi alias redirects with queries preserved; keep root web opt-out cookie behavior. Add canonical/alternates and localized sitemap entries, retaining legacy URLs. No false alternate links for missing/draft translations.
7. Test actual helper/schema/route behavior with Jest; key parity and build/type/lint checks. Run base comparison for pre-existing failures. Generate Prisma locally and verify migration applies and old schema remains compatible.
8. Visible browser public and admin flow against local test services; request correct environment before using provided account. Keep credentials in ignored env only. Record verification and limitations, commit only this issue files; owner now authorizes push and PR into main-real from isolated production baseline. Complete release/compatibility review; no merge/deploy.

Verification: yarn install --frozen-lockfile; yarn db:generate; focused Jest (public-post-locales/posts routes and existing public route/SEO tests); yarn lint; yarn type-check; SKIP_ENV_VALIDATION=true yarn build; locale JSON duplicate eval and API tracking eval. Full Jest when feasible; classify known Railway/vitest failures rather than claiming green.

9. Capture the repeated agent workdir mistake in an eval and AGENTS.md, as required by the existing same-mistake-twice rule.
10. Follow-up to Vercel #1001 build failure: reproduce TS2614 in the real package type-check; replace the copied `file:` dependency with the matching Yarn workspace range; verify the generated package declarations and the Vercel-filtered Turbo build where the local runner permits it.
11. Follow-up owner correction: preserve the existing `LandingPageClient` design at `/` and all `/{locale}` landing paths, keep translated article routes, and add path-based language selection and locale-aware article links. Verify at the local preview before pushing the correction PR.
12. Follow-up locale preference: resolve the browser `Accept-Language` only on the prefix-free root when no public preference cookie exists; save manual public selector choices in a separate `NEXT_PUBLIC_LOCALE` cookie. Preserve query strings and POS `NEXT_LOCALE`; verify first visit, repeat visit, explicit locale, and fallback behavior.
