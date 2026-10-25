# Plan

Issue: #1199 · Status: done · Spec: ./spec.md

1. Test đỏ/xanh trước: ghi golden từ `origin/dev` cho 7 route chưa có test (income, top-customers, system, today-metrics, dashboard, growth-metrics, enhanced-dashboard).
2. Thêm `revenue-mapping.ts` và export từ `core/index.ts`.
3. Chuyển 13 nơi ánh xạ và 7 nơi `OR` sang hàm dùng chung.
4. `yarn type-check` api, jest hai múi giờ, build api.
5. `.agent/api-changes/LOG.md`: một dòng, "không đổi hành vi".
