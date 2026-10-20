# Intent — #1114 localized public pages

Issue: #1114 · Branch `feat/1114-localized-public-pages` (off `dev`) · Owner agreed 2026-10-20

**What:** the four public marketing pages (pricing, features, download, AI image search) exist in all 12 public
languages at `/{locale}/...`, linked from the localized landing, header and footer, with their own SEO tags.

**Why:** priority 2 (multilingual). Today `/ru/pricing` and `/ru/tim-san-pham-bang-hinh-anh` are 404, `/en/features`
redirects, and every localized landing links to the Vietnamese pages.

**Constraints:** Vietnamese URLs and copy stay as they are; no API change; prices stay in VND as the plans define;
industry pages (`/cho-thue-*`) stay Vietnamese only; review JSON-LD only on the Vietnamese landing.
