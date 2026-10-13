# Intent — #946 landing page on a phone opens the App Store or Google Play

**What:** `anyrent.shop/` opened on an iPhone/iPad goes to the App Store, on Android to Google Play.

**Why:** owner (2026-10-13): phone visitors should not have to look for the download button.

**Constraints:** landing page only (`/`); desktop and crawlers / link-preview bots keep the page; `?web=1` keeps the
web page and is remembered on that device; SEO metadata unchanged; no API change; tests for the device detection.
