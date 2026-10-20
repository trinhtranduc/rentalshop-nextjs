---
name: translate-post
description: Use when a published Vietnamese blog post (anyrent.shop/post/<slug>) must exist in the other public languages (ru, en, zh-TW, ja, ko, zh, fr, de, th, id, es). Exports the post, translates it block by block, builds linked-translation payloads and gives the owner one command to publish them. The agent never writes to production.
---

# Translate a post into every public language

First used 2026-10-20 for post 29 "AnyRent: Phần mềm quản lý cửa hàng cho thuê…" (#1115). Posts are TipTap JSON,
one row per locale; editions share `translationKey`. `POST /api/posts` with `translationSourceId` links an
edition to its source (`packages/database/src/post.ts` `create`). `/{locale}/post` lists only PUBLISHED posts of
that locale; the language switcher on a post page goes to the linked edition.

Work in the scratchpad, never in the repo: `W=<scratchpad>/posts/<vi-slug>`. Scripts: `S=.claude/skills/translate-post/scripts`.

## 1. Export (read-only)

```bash
python3 -I $S/export_source.py <vi-slug> $W          # add --api https://dev-api.anyrent.shop for dev
```

Writes `source.json` and `blocks.json` (one block per top-level node: `h2`/`h3`, `p` as inline HTML with
`<strong>`, `<em>`, `<a href>`, `img` = alt text, `cap` = italic caption after an image). Check which locales
already have this post: `curl -s "https://api.anyrent.shop/api/posts/public?locale=<loc>&limit=50"`; skip those.

## 2. Translate

For each locale write `$W/tr/<locale>.json`:

```json
{"fields": {"title": "", "slug": "", "excerpt": "", "seoTitle": "", "seoDescription": "", "seoKeywords": ""},
 "blocks": ["one string per block of blocks.json, same order"]}
```

Rules:
- Native quality, the tone of the source (rental-shop owners). Translate everything; no Vietnamese left.
- Same facts only. Keep every caveat (illustrative examples, AI-generated images, scope depends on plan/version).
- Keep the brand "AnyRent". Reuse the product terms already used in `locales/<locale>/landing.json` and in
  earlier translated posts (how "áo dài", order statuses, "lịch giao trả" were rendered).
- Same number of `<a>` and `<strong>` per block (the build checks it). Point the AnyRent home link to
  `https://anyrent.shop/<locale>`; keep other hrefs unless a localized page exists (`/ru/pricing` may 404 — check).
- Amounts and currency unchanged (VND).
- `slug`: lowercase ASCII, digits, hyphens; Latin transliteration for ru, th, ja, ko, zh, zh-TW; unique per locale.
- Limits: title ≤ 255, seoTitle ≤ 60, seoDescription ≤ 160 (API allows 320, keep 160 for search results),
  excerpt 1–2 sentences, seoKeywords ≤ 255.
- zh (Simplified) and zh-TW (Traditional) are separate files; check regional words (软件/軟體, 账号/帳號…).
- A long post is many tokens: translate ru first, review it, then the rest. Delegating to one background agent
  with these rules is fine; it must not publish.

## 3. Build and check

```bash
python3 -I $S/build_payloads.py $W
```

Every locale must print `OK` (block count, no Vietnamese letters, link/bold counts, field limits, slug format).
It writes `publish/<locale>.json` (the API body, `status: PUBLISHED`, same featured image) and
`preview/<locale>.html` — open one or two in a browser before handing over.

## 4. The owner publishes

Production is read-only for agents. Give the owner, to run in their own terminal (never ask for the password
in chat):

```bash
node .claude/skills/translate-post/scripts/publish.mjs $W --dry-run   # lists what would be created
node .claude/skills/translate-post/scripts/publish.mjs $W             # asks for admin e-mail + password
```

Options: `--draft` (review in admin first), `--only ru,en`. A locale whose slug already exists is skipped.
Logging in from the script may end the owner's admin web session (single session). Do not point it at dev
with a production source id: `translationSourceId` is the source post's id in that environment.

## 5. Verify (read-only)

- `GET /api/posts/public?locale=<loc>` returns the new edition for every locale; the source now has a
  `translationKey`.
- `https://www.anyrent.shop/<loc>/post/<slug>` is 200 and its `<link rel="alternate" hrefLang>` set lists all
  editions.
- `/<loc>/post` shows the card. If a list page still shows "no articles" while the API has the post, report it
  (server data cache), do not re-publish.
