# Public landing and multilingual posts

Issue: #1000 · Status: in-progress · Created: 2026-10-16

## Outcome
Owner authorized implementing landing/post localization first, with public `/{locale}/post` URLs and admin selection, creation and independent editing per language. Supported public locales: vi, en, ja, ko, zh, ru, zh-TW, fr, de, th, id, es. POS operational languages stay unchanged. Existing posts remain user-editable and are never automatically published or translated, except for the specific AnyRent introduction article (public post ID 29), whose translations the owner explicitly requested.

## Follow-up correction (2026-10-16)
Preserve the existing AnyRent landing page and its section order, visuals, components, and interactions. Add public-language routing and language-aware article links/content to that page. The localized landing implementation must not replace the existing marketing page with a new layout.

## Follow-up locale preference (2026-10-16)
On a first visit to `/`, use the browser's preferred supported language once. Keep explicit URL locale and saved public-language preference authoritative, and keep this preference separate from the merchant POS locale.

## Follow-up public post presentation (2026-10-16)
Make localized post listing and detail pages visually consistent with the existing landing page, including the current brandmark/logo, header, colors, spacing, and responsive behavior. Keep each edition language-specific; a published Vietnamese article without an English edition must not appear in `/en/post`.

## Follow-up locale navigation and AnyRent article editions
When a reader changes language, keep them on the equivalent page: landing to landing, post list to post list, and an article to its published translated edition using that edition's own slug. Add localized editions of the already-published AnyRent introduction article (public post ID 29) for all supported public locales, preserving its illustrations and publishing each translation so it is available on its language route.

## Constraints
Use isolated worktree; preserve original dirty workspace. Keep API fields/status/default locale and role checks compatible. Owner subsequently authorized publishing the demo to production CMS (post 29, verified public), requested its locale versions, and requested PRs targeting main-real. This isolated branch starts from main-real to avoid bundling the unrelated dev release #999. Push and PR authorized; merge/deploy remain human-owned. Additive nullable translation grouping only; migrations generated locally. Credentials stored only in ignored local env by explicit owner request, never in git or output.

## Decisions
- Owner clarification: Vietnamese is the default without a prefix: /, /post, /post/{slug}. Other languages use /{locale}, /{locale}/post, /{locale}/post/{slug}. /vi aliases permanently redirect, preserving query strings.
- Link translated editions with optional translation key and optional source post ID; each edition may have its own slug and status.
- Unknown/unpublished translation returns 404; language switch offers available published editions and a listing for untranslated locales.
- Public copy is isolated from existing shop locale providers, so new marketing languages do not imply translated POS.
- Root and legacy /blog URLs remain functional.
- A locale selector preserves page context; article links use published sibling edition slugs and otherwise lead to that locale's post list.
- Only public post ID 29 is translated/published under this follow-up; other existing posts are untouched.
