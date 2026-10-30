# Plan — Gợi ý "Chi nhánh khác còn N"

Issue: #1347 · Status: in-progress · Skills: implement-issue, api-route-standard, api-compat-review, timezone-dates, i18n-keys, verify-change, review-pr

1. Test đỏ trước: `tests/api/other-outlets-availability.test.ts` (hàm thuần + route mock, có ngày, hai TZ, so với `batch-availability`), `tests/web-create-order-other-outlets.test.ts` (model web).
2. `apps/api/lib/other-outlets-availability.ts` (hàm thuần) + `apps/api/app/api/products/other-outlets-availability/route.ts`.
3. `packages/utils`: `apiUrls.products.otherOutletsAvailability`, `productsApi.checkOtherOutletsAvailability`, kiểu request / response.
4. Web: model thuần `other-outlets-model.ts`, hook trong `OrderEditor.tsx`, dòng trong `parts.tsx` (`CartLineRow`).
5. Chuỗi `locales/{en,vi,ja,ko,zh}/orders.json` (nối bằng Edit, kiểm `wc -l`, `locales-valid-json`).
6. Dòng `.agent/api-changes/LOG.md` (`planned` rồi `dev`).
7. Kiểm: Jest hai TZ, tsc api + client (so nền), eslint, e2e API trên DB riêng, kiểm trực quan Chrome có đầu.

Không làm: iOS/Android (PR 2m), khối chi tiết sản phẩm (PR 5), thu hẹp nhân viên (PR 3), Excel (PR 4).
