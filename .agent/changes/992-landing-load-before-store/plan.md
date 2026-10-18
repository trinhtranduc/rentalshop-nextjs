# Plan
Issue: #992 · Status: implemented (verification limits in verification.md)

1. Add focused unit coverage for middleware pass-through and actual client scheduling: loading vs complete, platform selection, opt-out and cleanup.
2. Simplify apps/client/middleware.ts to opt-out cookie only. Add apps/client/lib/landing-store-navigation.ts for tested scheduling; reuse store-redirect helpers. Replace iPad-only effect in LandingPageClient.tsx with shared client scheduling. Update helper comments.
3. Skills: implement-issue, verify-change, vercel-react-best-practices (effect cleanup, no render blocking). This is requested behavior evolution, not an accidental regression. No user-facing strings, date logic, API or migration changes.
4. Run standalone Jest targeted tests, client focused lint, root lint/type-check and full standalone tests. Inspect matching eval cases. Headed Chrome local E2E must hold a landing resource, prove HTML visible before load, then prove correct store navigation, and check opt-out/desktop.

## Risks / rollback
A resource that never finishes can delay window load, as explicitly requested. Revert this commit to restore server redirect. No production state changes.
