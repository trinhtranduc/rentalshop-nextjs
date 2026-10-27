# Plan: #1252

1. Web: `receipt-model.ts` thêm `stages` (pure), `ReceiptSlip.tsx` vẽ, `ReceiptDialog.tsx` truyền dịch. Jest TZ=UTC và Asia/Ho_Chi_Minh.
2. iOS: `DepositPlanReceipt` (DepositPlan.swift) dựng dòng; `Order.installments` giữ từ `Order.from(detail:)`; `toPrintData` in; `OrderShareSource/Model/Renderer` hiện. Test.
3. Android: `DepositReceipt.kt` dựng dòng; `ThermalPrinter.buildOrderReceipt`; `OrderShareModel` + renderer. Test.
4. Chụp ảnh trước/sau (web Chrome, iOS Simulator, AVD).
5. verify: Jest, tsc, xcodebuild test, gradle test, locales-valid-json.
