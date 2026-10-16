# Spec

Issue: #1000 · Status: in-progress (release blocked)

1. Exactly twelve supported public locale codes, checked centrally; existing five inputs/default vi remain accepted.
2. Vietnamese landing/list/detail use /, /post, /post/{slug}; other languages keep locale prefixes. /vi aliases permanently redirect with queries preserved; canonical, language links and sitemap use prefix-free Vietnamese URLs. Public routes derive content language from URL; invalid locale is 404. No fallback to a different-language post, no draft exposure.
3. Landing and post navigation, filters, empty/error states, dates, page metadata and language selectors have localized copy in each public locale.
4. Admin list query/filter and pagination preserve selected locale; creation preselects it. Editor loads and saves persisted locale without conflating admin UI language.
5. Create a translated edition from a source using optional translationSourceId; initial new edition is draft with blank translated title/body/SEO. Source and sibling updates remain separate by numeric ID; source need not be published for authorized editors.
6. Nullable translationKey plus unique (translationKey, locale) prevents duplicate editions. Public siblings contain only published locale/slug/title/ID; legacy null-key editions may link by matching slug, never by title.
7. Published edition metadata has its canonical localized URL and alternates only for published equivalents; list and landing equivalents exist for all supported locales. Sitemap lists published editions at their own URLs.
8. Existing /blog routes keep working; all older required response fields, permissions, default values and native callers remain unchanged. New metadata/request inputs optional.
9. Local tests cover locale/query/schema, DB grouping & independence, public visibility, path auth boundaries, no locale fallback, and translated message parity. Visible browser checks cover public pages, selectors, and admin create/edit with an isolated test API/data when possible.
10. Every public landing locale renders the existing `LandingPageClient` composition. Localization changes its copy, metadata, language selector, and locale-aware article links only; the replacement `PublicShell` landing layout is not used for landing routes.
11. On `/`, a saved `NEXT_PUBLIC_LOCALE` preference wins. If absent, choose the best supported locale from `Accept-Language` once, save it, and redirect to its public URL (Vietnamese remains prefix-free). Unsupported/missing browser languages resolve to vi. Explicit locale URLs always win, and public preference never reads or writes the POS `NEXT_LOCALE` cookie.
12. Public post listing and detail pages use the current landing brandmark and consistent landing visual language on desktop and mobile; public navigation/language selection remains locale-aware.
13. A post is listed only for its own published locale edition. Cross-language fallback is not allowed; translated editions must be explicitly created and published.
14. Public locale switching preserves the current page type. Article detail uses the published sibling edition's locale-specific slug; if no sibling is published yet, it opens that locale's post list.
15. The owner-requested public AnyRent introduction post (ID 29) has published editions for the supported public locales, with translated title, excerpt, body, SEO fields, and matching illustrations. The original Vietnamese edition remains unchanged.

Out of scope: native POS language expansion; translation of arbitrary existing articles; publishing the marketing demo; payments/orders/attendance behavior; production release.
