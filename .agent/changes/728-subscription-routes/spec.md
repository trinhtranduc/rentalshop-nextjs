# Spec

1. `authenticateRequest(request, { skipSubscriptionCheck })` skips `checkMerchantSubscriptionStatus` when true. `withAuthRoles` and `withPermissions` pass `skipSubscriptionCheck: !requireSubscription`. Default (no option) still checks.
2. `getCurrentEntityCounts` counts outlets `isActive: true`, customers `isActive: true, deletedAt: null`, orders `deletedAt: null`. Customer and outlet DELETE only set `isActive = false`; order DELETE sets `deletedAt`.
3. Out of scope: `/api/auth/verify`, `/api/users/profile` (no flag), PAUSED / CANCELLED policy question, web renew bar not mounted, `getEntityCountsForAddonDeletion`.

Tests: BF-SUB-17, 18, 19, 48, 49, 50 become plain tests. WEB-SUB-01..05 `-merchant-c`, `-merchant-d` flip after merge.
