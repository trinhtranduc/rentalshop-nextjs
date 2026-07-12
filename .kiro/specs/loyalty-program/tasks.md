# Tasks — Loyalty Program (refactor về chuẩn)

> Đưa code loyalty hiện tại về đúng `architecture.md`. Thứ tự theo dependency + rủi ro (làm cái nền + rủi ro cao trước). Mỗi task ghi rõ file, tiêu chí done, và invariant liên quan.
> Ký hiệu: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong.

## Nhóm 0 — Nền tảng (làm trước, ít rủi ro)

- [ ] **T0.1 — Hằng số & vocabulary.** `packages/loyalty/src/constants.ts`: export `TX_TYPE = {EARN,REDEEM,ADJUST,REFUND,TIER_UPGRADE}`, `TX_SOURCE = {SYNC:'sync'}`, các `LOYALTY_ERROR` codes (§8). Thay mọi chuỗi hard-code rải rác.
  - _Done:_ không còn literal `'earn'`/`'Đồng bộ'` trong logic; grep sạch.

- [ ] **T0.2 — Pure calc module.** Tách `packages/loyalty/src/calc.ts`: `calcEarnPoints`, `calcMaxRedeemable`, `evaluateTier` — thuần, không chạm DB. Earn/redeem/tier import từ đây.
  - _Done:_ có unit test cho biên (floor, multiplier, cap %, remaining).

- [ ] **T0.3 — Partial unique index chống earn trùng (INV-4).** Migration Prisma thủ công: `CREATE UNIQUE INDEX loyalty_tx_earn_once ON "LoyaltyTransaction"("orderId") WHERE type='earn';`
  - _Done:_ chạy earn 2 lần cùng orderId → lần 2 bị DB chặn (không chỉ app-check).

## Nhóm 1 — Sửa 2 bug rủi ro cao nhất

- [x] **T1.1 — Fail-open cho status route (#4, INV-6).** ✅ `status/route.ts`: bọc try/catch fail-open quanh CANCELLED/RETURNED hook; gate chỉ chạy khi status ∈ {CANCELLED, RETURNED} (gộp luôn T2.2 cho route này).

- [x] **T1.2 — Sync về ledger-authoritative (#1,#2,#3,#8, §6a).** ✅ Viết lại `sync-history/route.ts`: xóa backfill cũ theo `metadata.source='sync'`; query đơn `NOT EXISTS(earn tx)`; tạo 1 `adjust`(source=sync)/customer; **derive** points/earned/redeemed từ ledger + spent/orders từ Order + tier từ metric. Bỏ `loyaltyPointLot.deleteMany`.
  - _Còn thiếu:_ integration test scenario "ngày 10" (cần DB) — sẽ làm ở nhóm test.

## Nhóm 2 — Race-safety & perf

- [x] **T2.1 — Redeem guard nguyên tử (#5, INV-5).** ✅ ĐÃ ĐẠT sẵn trong `order-hooks.ts:224` (`updateMany WHERE points>=N` + check `count===1`). Không cần sửa. (Verify lại khi viết test concurrent.)

- [~] **T2.2 — Gate perf (#6, INV-7).** Status route: xong (chỉ gọi khi CANCELLED/RETURNED). _Còn:_ `orders/route.ts` create — nhánh SALE (dòng 763-767) vẫn gọi `merchantHasLoyaltyFeature` cho mọi đơn SALE có customer; gộp resolve features 1 lần chung với nhánh redeem.
  - _Done:_ merchant KHÔNG loyalty: tạo/đổi status đơn không phát sinh query merchant-plan thừa.

## Nhóm 3 — Hoàn thiện nghiệp vụ

- [ ] **T3.1 — Tách endpoint re-eval hạng (§6b).** `POST /api/loyalty/reevaluate-tiers` (perm `loyalty.manage`): chỉ tính lại `totalSpent/totalOrders` + `currentTierId`, KHÔNG đụng điểm. Đây là nút "ngày 10 thêm tier".
  - _Done:_ chạy sau khi thêm tier → hạng cập nhật, balance bất biến.

- [ ] **T3.2 — Recalculate balance admin (§6c, Req 12.5).** `POST /api/loyalty/recalculate` (perm `loyalty.adjust`): derive toàn bộ cache từ ledger + orders cho 1 customer / cả merchant. Dùng chung hàm derive với backfill/reeval.
  - _Done:_ cố tình làm lệch cache → recalc đưa về đúng `SUM(ledger)`.

- [ ] **T3.3 — Luồng edit đơn (Req 7, #7).** `apps/api/app/api/orders/[orderId]/route.ts` (PUT): (a) sửa làm `finalAmount<0` → **REJECT 400**; (b) đổi `customerId` → reverse customer cũ; (c) sửa item SALE đã earn → tạo `adjust` chênh lệch. Tất cả fail-closed cho redeem, fail-open cho earn.
  - _Done:_ 3 kịch bản có test; reject có message rõ.

## Nhóm 4 — Chốt chất lượng

- [ ] **T4.1 — Dọn point lots khỏi runtime V1 (§9).** Gỡ import `expiry.ts` + mọi lời gọi tạo/xóa lot khỏi earn/sync. Giữ model + file như hạ tầng ngủ. Ghi chú Phase 2.
  - _Done:_ grep runtime không còn `loyaltyPointLot.` trong luồng V1.

- [ ] **T4.2 — Verify `amountDue` không đổi cho đơn cũ.** Đối chiếu `calculateAmountDue` với công thức cũ; đơn không-loyalty phải cho amountDue y hệt trước merge.
  - _Done:_ snapshot vài đơn cũ trước/sau → khớp.

- [ ] **T4.3 — Guard "không plan cũ nào chứa loyalty".** Script/kiểm tra DB: không merchant đang chạy nào vô tình có `"loyalty"` trong `plan.features` trước khi bật.

- [ ] **T4.4 — Smoke test luồng cũ.** Merchant KHÔNG loyalty: tạo/sửa/hủy/trả đơn → hành vi = trước merge (INV-7).

## Thứ tự thực thi
`T0.1 → T0.2 → T0.3 → T1.1 → T1.2 → T2.1 → T2.2 → T3.1 → T3.2 → T3.3 → T4.*`

Bắt đầu ngay: **T1.1 (fail-open)** và **T1.2 (sync ledger)** — 2 việc rủi ro cao nhất, đã đủ ngữ cảnh làm.
