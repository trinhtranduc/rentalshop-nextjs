# Plan: Thế chân tách 2 phần

Issue: #1273

1. Test đỏ: iOS `OverviewDashLogicTests` (collateralSections...), Android `CollateralSectionsTest`, web `tests/web-overview-model.test.ts`.
2. Logic thuần ở ba nơi, cùng quy tắc: `OverviewDashLogic.collateralSections`, `OverviewRelated.sections`, `overview-model.collateralSections`.
3. Chuỗi: iOS + Android en/vi (nối bằng `cat >>`, kiểm `wc -l`, `plutil -lint`, XML), web 5 ngôn ngữ.
4. UI: iOS bảng có section + dòng tổng trong danh sách; Android LazyColumn có header + dòng tổng; web bảng có hai khối. Chỉ khi kind = collateral.
5. Kiểm: Jest (TZ=UTC, TZ=Asia/Ho_Chi_Minh), `locales-valid-json`, `mobile-error-catalog`, tsc/eslint, iOS unit, Android unit + compile, ảnh thật 3 nền tảng.
6. Dòng mới trong `.agent/api-changes/LOG.md` (không đổi API).
7. PR vào dev, tiếng Việt, `Fixes #1273`, ảnh trước/sau.
