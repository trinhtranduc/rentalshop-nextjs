# Spec — #1230

1. Hàm dùng chung `installmentPaymentMetadata(source, stage, extra?)` trong `apps/api/lib/installments.ts` dựng `metadata` (JSON string) gồm `kind: 'COLLECT'`, `source`, `plannedAmount` (mức giai đoạn lúc thu), và `collectedOn` khi có. Route tạo đơn (`CREATE_ORDER`) và route `collect` (`INSTALLMENT`) cùng gọi hàm này.
2. Hết: `effectivePlan` không đổi (đã đọc `plannedAmount` từ #1220).
3. Thu đủ lúc tạo đơn rồi đổi tổng: giai đoạn 1 `PAID`, `i2` / `rest` tính lại. Thu thiếu: `PARTIAL`.
4. Payment cũ không có `plannedAmount`: hành vi cũ (so với mức theo tổng hiện tại). Không migrate.
5. Không có chỗ ghi Payment giai đoạn nào khác: "Giao đồ · thu" trên web gọi chính `collect`; thu nốt `rest` khi giao là số tính, không có Payment riêng.
