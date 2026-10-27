# Plan

1. Test đỏ: `tests/api/cancel-by-stage.test.ts` (huỷ đồng thời, `remaining` của đơn huỷ), test web model cho dòng giữ/hoàn. Commit.
2. Sửa `recordPlanCancellation` (guard + tính lại trong khoá).
3. Sửa `installmentSummary` bỏ giai đoạn VOID.
4. Web: dòng giữ/hoàn trên thẻ đơn huỷ.
5. Dòng `.agent/api-changes/LOG.md`, ghi mục "Things agents get wrong" nếu cần.
6. Jest hai múi giờ, `locales-valid-json`, `mobile-error-catalog`.
