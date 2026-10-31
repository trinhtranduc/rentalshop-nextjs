# 3-page onboarding: AI photo search, overlap warning, Calendar

Issue: #1404 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-31

## Problem

The first-login onboarding (V2, flag `newAuth`) shows three to-do pages with a small icon and no motion.
It does not show why AnyRent is worth using, or what the app looks like.

## Proposed outcome

Variant A of tab "★ 3 trang hướng dẫn" (artifact 9b56KwErJWiGpiyFEfyEY4) replaces those pages on iOS and Android:
one photo travels through three pages, each with its own short effect that repeats while the page shows.

## Affected users and systems

Every role on first login, iOS (`apps/mobile`) and Android (`apps/mobile-android`). No API, no web, no database.

## Constraints

- Keep the `newAuth` flag, the "shown once" storage, Bỏ qua / Tiếp / Bắt đầu, and the flow into Home.
- The first-run guide (#1393/#1394) starts after these pages. Not changed here.
- Natively built (UIKit, Compose). No video, no Lottie, no new dependency.
- Every word is a string, no text in images. en and vi only.
- Sample money (VND in vi, USD in en) is fixed sample data, not the shop's currency.
- Images are stand-ins until the owner supplies real photos.

## Open questions

None.

## Decision log

- 2026-10-31 — Variant A, content and motion approved (owner).
- 2026-10-31 — Each page's motion is one pure function of time, ported to both apps with the mockup's numbers. Cancel, repeat and "finished state" all read that function, so they cannot drift or stack (agent; the tab's API list is not binding, the owner asked for native code).
- 2026-10-31 — A repeat fades the finished state out for 0.2s before the effect starts, because the loop was added after the mockup and a hard cut looked like a glitch. It does not count toward the ~1.5s effect (agent).
- 2026-10-31 — Android reuses `v2_create_overlap_title` ("Overlapping booking") and iOS `cart.overlap.title` ("Schedule overlap"), as the tab says to reuse keys. The English differs between the apps today; not changed here (agent).
