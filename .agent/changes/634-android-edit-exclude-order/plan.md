# Plan — #634
1. Failing test: `DefaultAvailabilityRepositoryBatchTest` (body carries `excludeOrderId` when editing, omits it otherwise). Commit. FIX_MODE=1.
2. `AvailabilityRepository.checkBatchAvailability(..., excludeOrderId: Int? = null)`; repository puts it in the body.
3. `CartV2Screen`: pass `editingOrderId`; drop the `editingOrderId != null` guard on overlap conflicts.
4. Verify: `./gradlew :app:assembleDebug :app:testDebugUnitTest`.
