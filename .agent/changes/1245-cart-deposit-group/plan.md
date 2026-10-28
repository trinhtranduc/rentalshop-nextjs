# Plan
1. iOS: `DepositPlanMath.stages` percent + test; `CartV2ViewController.stagedSection` nhóm lại; strings en+vi.
2. Android: cùng logic trong `DepositPlanMath.stages` + test; `CartStagedSection.kt`; strings en+vi.
3. Web: kiểm OrderEditor/StagePlanPanel, chỉ sửa nếu có phần tương tự hàng phẳng.
4. Kiểm: iOS unit test, Android testDebugUnitTest, web tsc/jest, locales-valid-json, mobile-error-catalog. Ảnh trước/sau ở shots/.
API compatibility: không đổi API; không thêm dòng LOG.md.
