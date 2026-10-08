# Plan — #670
1. API: `canSeeChangeHistory` in apps/api/lib/change-history.ts, gate 4 routes; tests in tests/api/change-history-routes.test.ts.
2. Web: `attachHistoryActors`, `actorInitials` (orders-model.ts), `ordersApi.getOrderChanges`, HistoryCard; tests/web-order-history-actor.test.ts.
3. iOS/Android: footer parts + `canView(role)`; unit tests.
4. Verify: jest (both TZ), tsc/lint on changed files, Android test+assemble, iOS tests+build, headed web run with local API.
