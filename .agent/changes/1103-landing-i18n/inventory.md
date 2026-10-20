# Inventory: landing texts not in the page language (#1103, 2026-10-20)

Live scan of https://www.anyrent.shop (read-only), visible text nodes on each landing page:

| Locale | Vietnamese texts | English-only texts | Cause |
|---|---|---|---|
| vi | — | 8 | hardcoded English (trust bar, "Why Choose Us", stats, flow label) |
| en | 20 | — | hardcoded Vietnamese (tagline, AI link, industries, Zalo QR, footer) |
| ja, ko, zh | 20 | 8 each | same hardcoded texts + English flow label |
| ru, zh-TW, th | 20 | 101 each | landing namespace is the English file with 9 keys overridden (`layout.tsx` `getPublicContentMessages`) |
| fr / de / es / id | 20 | 103 / 102 / 104 / 107 | same |

Message files: `locales/{vi,en,ja,ko,zh}/landing.json` have 211 keys each, none missing. The 7 newer locales have no `landing.json`; only `public.json` (36 keys).

Hardcoded in source:
- `LandingPageClient.tsx`, about 45 texts:
  - tagline;
  - trust bar ×3;
  - hero alt;
  - "Snap";
  - AI link;
  - industries (title, subtitle, 4×title/desc);
  - "Why Choose Us";
  - stats ×4;
  - "Testimonials";
  - "Price:" ×2;
  - sr-only pricing text;
  - footer (AI search, industries ×5);
  - Zalo / WhatsApp / Telegram titles, QR title / hint / button / close / alt, greeting message;
  - 11 section aria-labels.
- `PublicSiteFooter.tsx`: AI search + industries ×5.
- `BlogSection.tsx`: "Blog" badge ×2, aria-label ×2.

Left as is (out of scope): JSON-LD `reviewBody` (SEO data), plan-name matching on "liên hệ" (logic), store badge artwork alt (official badge text), links to the Vietnamese-only industry and image-search pages.
