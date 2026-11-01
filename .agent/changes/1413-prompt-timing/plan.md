# Plan: prompt timing

Issue: #1413 · Status: in-progress

Skills: `bug-fix-tdd`, `mobile-parity`, `verify-change`. No API path changes, so no `api-compat-review` row.

1. Failing tests: rule stubs with today's behaviour, tests for the 5th order, the guide, and notification gating (iOS + Android). Commit red.
2. iOS rating: `RatingPromptRule`, `RatingManager` reads the total, flow tests.
3. iOS notifications: `start()` only registers when allowed; Home asks.
4. Android: move the ask to `MainTabs`, with an "asked" mark that survives logout.
5. UI test and watch on a dedicated Simulator and AVD with a new empty shop. Screenshots to `~/Documents/AnyRent-shots/prompt-timing/`.
6. PR into `dev`, Vietnamese body.
