# Plan — Android product orders: a new sort starts at the top

Issue: #1066 · Status: approved · Spec: ./spec.md

## Steps

1. Failing test first: `app/src/test/java/com/anyrent/pos/ui/orders/EntityOrdersPagingTest.kt` (first page: scroll
   then show; next page: show only). The JVM tests have no Robolectric / Compose UI test, so the LazyColumn part is
   checked on an emulator.
2. `ui/orders/v2/EntityOrdersPaging.kt`: `showFirstPage(rows, scrollToTop, show)`, `showNextPage(rows, show)`.
3. `ui/orders/v2/EntityOrdersScreen.kt`: the load effect calls `showFirstPage` with `listState.scrollToItem(0)`;
   the load-more path calls `showNextPage`.
4. Verify: `./gradlew :app:assembleDebug :app:testDebugUnitTest`; a windowed emulator against a local API with its
   own Postgres: product → Tất cả → "Cũ nhất trước", screenshots before and after the fix.

## Files

- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/orders/v2/EntityOrdersPaging.kt`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/orders/v2/EntityOrdersScreen.kt`
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/ui/orders/EntityOrdersPagingTest.kt`

## Risks

UI only. No API, no data, no strings.

## Rollback

Revert the PR.
