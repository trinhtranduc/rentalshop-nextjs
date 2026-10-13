# Spec — #946

## Behaviour (path `/` only)
| Request | Result |
|---|---|
| iPhone / iPod / iPad UA (`iPhone`, `iPad`, `iPod`) | 307 → `APP_STORE_URL` |
| Android UA | 307 → `GOOGLE_PLAY_URL` |
| iPadOS "desktop site" UA (`Macintosh` + touch) | server cannot tell it from a Mac → page loads, a small client check (`maxTouchPoints > 0`; Macs report 0) sends it to the App Store |
| Desktop (Chrome, Safari, Firefox, Edge) | landing page |
| Bots / previews (Googlebot, Bingbot, facebookexternalhit, Zalo, Twitterbot, WhatsApp, Telegram, Slack, Discord, LinkedIn, Lighthouse, headless…) | landing page |
| `?web=1` | landing page + cookie `anyrent_web=1` (1 year) |
| cookie `anyrent_web=1` | landing page |
| Not a page load: non-GET, `Accept` without `text/html` (Next in-app navigation / prefetch), `Purpose: prefetch` | landing page (no redirect inside client navigation) |

Any UA containing `Zalo` is treated as a preview / in-app browser and not redirected (safe default).

## Not changed
Every other path (`/login`, `/kiosk/qr/*`, shop pages, bills, SEO pages), page metadata and JSON-LD, the API.
