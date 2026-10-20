# Plan (#1103)
1. Inventory (`inventory.md`), failing test.
2. `landing-messages.ts` + layout wiring; new keys in en, vi, ja, ko, zh; JSX uses `t()`.
3. Full `landing.json` for ru, zh-TW, fr, de, th, id, es.
4. Verify: jest (this file + locales-valid-json + landing tests), eslint/tsc touched files, client build, local headed browser screenshots for ru, ja, th; live-style text scan on the local pages.
5. PR to dev, `Fixes #1103`, API compatibility: none.
