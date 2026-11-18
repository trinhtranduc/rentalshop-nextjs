# Web: back to the product list keeps its filters; a new tab keeps the language

Issue: #1627 · Author: Claude (for the owner) · Status: done · Created: 2026-11-18

## Problem

Two bugs on the shop web (`apps/client`), reproduced in headed Chrome on a local stack (2026-11-18):

1. **The product list loses its filters.** Sản phẩm with a sort and page 2 (`/products?sort=priceDesc&page=2`) →
   "Sửa" → "Lưu thay đổi" → product detail → "← Sản phẩm" opens `/products`: page 1, default sort. Filters and the
   page live only in the list URL, and every way back to the list is a fixed `/products`
   (`products/[id]/page.tsx:126,191`, `products/form/ProductFormPage.tsx:449,472,556`, the "Sản phẩm" breadcrumb).
2. **A new tab switches English to Vietnamese.** The landing page `/en` speaks English through the middleware header
   `x-anyrent-public-locale` and does not set `NEXT_LOCALE`. "Log in" (`<Link>`) and the login (`router.push`) are
   client navigations, so the root layout keeps the landing language for the whole tab. A new tab (or F5) renders on
   the server from `NEXT_LOCALE`, which is missing, so the app is Vietnamese (`layout.tsx:826`).

## Proposed outcome

1. Every way back to the list from the product pages (detail "← Sản phẩm", delete on detail, add form "←" / "Huỷ",
   the "Sản phẩm" breadcrumb) opens the list with the filters and page this tab last showed.
2. The logged-in pages speak the language saved in Settings (`NEXT_LOCALE`). With none saved, the language the tab
   shows is saved. A new tab and F5 then show the same language.

## Affected users and systems

Every role on the shop web. `apps/client` only. No API, no mobile, no migration.

## Constraints

- Owner: "đơn giản và chuẩn".
- After saving an edit the form still opens the product detail (unchanged).
- The left menu "Sản phẩm" still opens the default list.
- The landing and public shop pages keep their own language rules (#1146, #1551); only logged-in pages change.

## Open questions

- None.

## Decision log

- 2026-11-18 — Language rule: the language saved in Settings wins on the logged-in pages; none saved → save the
  shown one (like sign-up #1551). After saving an edit, keep going to the product detail. (owner: "tôi đồng ý" to the
  recommended options)
- 2026-11-18 — The list query is remembered per tab (`sessionStorage`), so two tabs with different filters do not mix.
