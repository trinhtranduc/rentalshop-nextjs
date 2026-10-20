# Plan (#1100)
1. `apps/client/lib/landing-reveal.ts`: `revealStart(win, el)` → 'in' | 'ready' | 'off', `observeReveal(win, el, onIn)`; test trước `tests/landing-reveal.test.ts` (giả lập window/IntersectionObserver), kiểm tra cả CSS có khối reduced-motion.
2. `FeatureSpotlight.tsx`: khối hình có `data-anim`; `LandingPageClient.tsx`: gắn class `la-phone`, `la-left`, `la-right`, `la-bottom`, `la-pill`, `la-hero`.
3. `globals.css`: keyframes + reduced-motion.
4. Kiểm: jest, lint, type-check, build client; xem bằng trình duyệt có cửa sổ ở `/`, `/ru`, `/en`.
