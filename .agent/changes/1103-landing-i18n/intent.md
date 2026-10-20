# Intent: landing page fully translated in the 12 public locales (#1103)

**What:** every visible text on the public landing (`/`, `/{locale}`) and the shared public footer is in the page's language.
**Why:** owner (2026-10-20). While doing #1100, `/ru` showed English feature steps and a Vietnamese link; the live scan shows ~100 English texts on each of ru, zh-TW, fr, de, th, id, es and ~20 Vietnamese texts on every non-vi page.
**Constraints:** no API change, no layout change; keep the existing vi/en wording except texts that were hardcoded in the JSX; product terms consistent with the translated intro post (scratchpad posts, #1087 session).
**Out of scope:** JSON-LD `reviewBody` structured data, the Vietnamese-only industry pages (`/cho-thue-*`, `/tim-san-pham-bang-hinh-anh`), App Store / Google Play badge artwork.
