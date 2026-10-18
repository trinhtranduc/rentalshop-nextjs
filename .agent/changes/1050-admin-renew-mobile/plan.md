# Plan — #1050

1. Test first: `tests/admin-renew-mobile-footer.test.ts`
   - pure `applyVisualViewportVars(style, viewport)` sets / clears `--ar-vvh`, `--ar-vvt`
   - `ResponsiveDialogFooter` wires it to `window.visualViewport` (resize + scroll, cleanup)
   - the four dialogs use `var(--ar-vvh,100dvh)` / `var(--ar-vvt,0px)` below 768 px and keep `md:max-w-lg`
   - Change Plan footer has a hint when `paymentReady` is false
   Commit `test(admin): reproduce renew/change-plan footer hidden on a phone`.
2. Fix (`FIX_MODE=1`):
   - `packages/ui/.../Subscriptions/components/visual-viewport.ts`: `applyVisualViewportVars`, `useVisualViewportVars`
   - `ResponsiveDialogFooter`: call the hook; optional `hint` prop (phone and desktop, small text)
   - swap `max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:top-0` for the variables in the four dialogs
   - Change Plan passes `hint` when payment is due and not ready
3. Verify: the test, `tests` admin dialog tests, admin lint + tsc, headed Chrome at 390×844, 375×667, 1280×800
   with a simulated keyboard; submit extend and change plan against the local DB.
4. PR into `dev` with `Fixes #1050`, Vietnamese body.
