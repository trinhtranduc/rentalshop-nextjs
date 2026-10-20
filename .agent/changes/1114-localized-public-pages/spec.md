# Spec — #1114

## URLs

| Page | vi (unchanged) | other 11 locales (`en ja ko zh ru zh-TW fr de th id es`) |
|---|---|---|
| Pricing | `/pricing` | `/{locale}/pricing` |
| Features | `/features` | `/{locale}/features` |
| Download | `/download` | `/{locale}/download` |
| AI image search | `/tim-san-pham-bang-hinh-anh` | `/{locale}/image-search` |

- `/vi/pricing`, `/vi/features`, `/vi/download` redirect 308 to the Vietnamese URL; `/vi/image-search` → `/tim-san-pham-bang-hinh-anh`.
- `/{shop}/pricing` (not a public locale) is 404; shop pages (`/{tenantKey}/products`) are untouched.
- The middleware sets the public locale for these paths, so the page, header and footer render in that language.

## Content
- All text comes from translations; 12 locales have every key (no Vietnamese or English left over except names,
  numbers, store badges).
- Pricing: existing `plans.pricingPage` texts; prices stay in VND, number format follows the page language.
- Features: existing `features` texts plus the screenshot labels that were hardcoded in Vietnamese.
- Download and AI image search: copy moved from the page files into `locales/*/publicPages.json`; the Vietnamese
  text is the current text, unchanged.

## SEO
- Each page has its own title and description per language, canonical = its own URL, `hreflang` for the 12
  languages + `x-default` (the Vietnamese URL), the same group on every sibling.
- Sitemap lists the 4 × 12 URLs with the same alternates.
- JSON-LD (WebPage, breadcrumb, FAQ) in the page language.

## Links
- On a localized page (path starts with a non-vi public locale), header, footer and landing links go to the same
  language: home, pricing, features, download, image search, blog (`/{locale}/post`), FAQ/contact anchors on the
  localized home; industry links go to `/{locale}/features`.
- On Vietnamese pages every link is unchanged.
- Landing review JSON-LD (Vietnamese reviews) is only on the Vietnamese landing.
