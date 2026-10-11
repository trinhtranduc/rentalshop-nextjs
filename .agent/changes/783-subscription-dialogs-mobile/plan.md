# Plan
1. Measure before (done at 390 px: renew, extend, change plan). Script: headless Chrome `isMobile`, login as admin, open each dialog, measure document and dialog overflow, controls under 44 px, footer visibility; screenshots.
2. Add `ResponsiveDialogFooter`; apply to the three dialogs (spec 1-6).
3. Measure after at 390 px and 1280 px; compare with before; admin build.
4. PR to dev, `Fixes #783`, screenshots before / after.
