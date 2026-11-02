# Spec: #1402

- The test is renamed `onlyMerchantManages`.
- `canManage` is true for MERCHANT, false for OUTLET_ADMIN, OUTLET_STAFF, null.
- ADMIN and OPS: false, as the app code in 27f984ff6 decided (`role == "MERCHANT"`).
- `:app:testDebugUnitTest` is green.
