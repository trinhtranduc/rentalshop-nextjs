# Architecture Standard — Loyalty Program

> **Kim chỉ nam kiến trúc.** Mọi code trong `packages/loyalty` và các điểm tích hợp (`orders`, `payments`, `status`) PHẢI tuân theo tài liệu này. Khi code và tài liệu mâu thuẫn → tài liệu đúng, code sai (trừ khi tài liệu được cập nhật có chủ đích).
>
> Đọc kèm: `requirements.md` (WHAT) và `design.md` (HOW chi tiết). File này định nghĩa **các nguyên tắc bất biến** không được phá dù implement kiểu gì.

---

## 0. Triết lý cốt lõi (một câu)

> **Ledger (`LoyaltyTransaction`) là nguồn chân lý duy nhất cho điểm. Mọi con số điểm khác chỉ là cache có thể tính lại 100% từ ledger. Metric xếp hạng (`totalSpent`/`totalOrders`) là nguồn chân lý riêng, tính từ `Order`.**

Hai nguồn chân lý, hai trách nhiệm tách biệt — đừng bao giờ trộn:

| Khái niệm | Nguồn chân lý | Không bao giờ derive từ |
|---|---|---|
| **Điểm** (balance, earned, redeemed) | `LoyaltyTransaction` ledger | ~~Order~~ |
| **Metric hạng** (totalSpent, totalOrders, tier) | `Order` (completed/returned) | ~~ledger~~ |

Đây là gốc rễ để tránh bug "phantom points" và "double-count" đã gặp ở `sync-history`.

---

## 1. Bảy bất biến (INVARIANTS) — không được phá

### INV-1: Balance = SUM(ledger)
```
CustomerLoyalty.points        === SUM(LoyaltyTransaction.points)              [cho customer đó]
CustomerLoyalty.totalEarned   === SUM(points WHERE points > 0)
CustomerLoyalty.totalRedeemed === -SUM(points WHERE type = 'redeem')
```
`points`, `totalEarned`, `totalRedeemed` trên `CustomerLoyalty` là **cache**. Sau BẤT KỲ thao tác điểm nào, cache phải bằng đúng công thức trên. **Không bao giờ** gán `points` từ một nguồn khác (vd tính từ orders) mà không đồng thời tạo transaction tương ứng.

### INV-2: Ledger là append-only (immutable)
Không UPDATE, không DELETE một `LoyaltyTransaction` đã tạo — **trừ** thao tác backfill idempotent (§6) xóa đúng các dòng backfill do chính nó tạo. Sửa sai = tạo transaction đảo ngược (`adjust`/`refund`), không sửa dòng cũ.

### INV-3: Metric hạng tính từ Order, không từ ledger
```
totalSpent  = SUM(Order.totalAmount) WHERE status IN (COMPLETED, RETURNED) AND deletedAt IS NULL
totalOrders = COUNT(*)               [cùng điều kiện]
```
`totalSpent` dùng **gross** `Order.totalAmount` (không trừ discount/redeem, không gồm lateFee/damageFee vì chúng là cột riêng). Tier chỉ đi lên (V1 never downgrade).

### INV-4: Mỗi order chỉ earn một lần (idempotent earn)
Trước khi tạo transaction `earn`, kiểm tra đã tồn tại `LoyaltyTransaction WHERE orderId = ? AND type = 'earn'` → nếu có thì skip. DB nên có **partial unique index** trên `(orderId) WHERE type='earn'` để chống race (xem §4).

### INV-5: Thao tác điểm là atomic + race-safe
Mọi mutation trừ/cộng điểm chạy trong **một** `prisma.$transaction`, và bước trừ điểm dùng **guard nguyên tử** (`updateMany WHERE points >= N`, check `count === 1`), KHÔNG dùng `findUnique` rồi `update` (§4).

### INV-6: Earn fail-open, Redeem fail-closed
- **Redeem** lỗi → **chặn** (rollback đơn hoặc reject sửa). Tiền khách phải đúng.
- **Earn** lỗi → **không bao giờ chặn** hoàn thành đơn. Log lỗi, đơn vẫn xong (Req 12.3).

### INV-7: Loyalty phải "vô hình" với merchant chưa bật
Mọi hook trong luồng order/payment PHẢI đứng sau feature-gate. Merchant không có `"loyalty"` trong plan features → **zero** thay đổi hành vi, và lý tưởng là **zero** query DB thêm (§7).

---

## 2. Vai trò từng bảng (authoritative vs cache)

| Bảng | Vai trò | Authoritative? |
|---|---|---|
| `LoyaltyTransaction` | Sổ cái bất biến mọi biến động điểm | ✅ **Nguồn chân lý điểm** |
| `Order` (+ 3 cột loyalty) | Giao dịch bán/thuê | ✅ **Nguồn chân lý metric hạng** |
| `CustomerLoyalty` | Cache: balance + metric + tier hiện tại | ❌ Cache — derive được từ ledger + orders |
| `LoyaltyProgram` | Config (earn/redeem/tier rule) | ✅ Config |
| `LoyaltyTier` | Định nghĩa hạng | ✅ Config |
| `LoyaltyPointLot` | Cấu trúc FIFO cho **expiry (Phase 2)** | ⚠️ Reserved — xem §9 |

**Cột loyalty trên Order** (`loyaltyPointsRedeemed`, `loyaltyDiscount`, `loyaltyPointsEarned`) là **snapshot tiện tra cứu**, KHÔNG phải nguồn chân lý điểm — nguồn là các transaction có `orderId` đó. Chúng tồn tại để hiển thị nhanh trên order detail và để `handleLoyaltyOnCancel` biết cần đảo bao nhiêu.

---

## 3. Vocabulary ledger — 5 loại transaction

`LoyaltyTransaction.type` là enum-string đóng. **Không thêm loại mới** mà không cập nhật tài liệu này.

| type | Dấu points | Khi nào tạo | orderId | Idempotency |
|---|---|---|---|---|
| `earn` | `+` | Đơn hoàn thành (SALE tạo / RENT trả) | ✅ | 1 earn / order (INV-4) |
| `redeem` | `−` | Staff dùng điểm giảm giá lúc tạo đơn | ✅ | 1 redeem / order |
| `adjust` | `±` | Điều chỉnh thủ công; đảo earn khi hủy; recalc khi sửa item; **backfill lịch sử** | ✅ hoặc `null` | Backfill: theo marker (§6) |
| `refund` | `+` | Hoàn điểm đã redeem khi hủy đơn | ✅ | 1 refund / order |
| `tier_upgrade` | `0` | Ghi nhận lên hạng (audit) | tùy | — |

**Quy ước bắt buộc:**
- `balanceAfter` = balance customer NGAY SAU transaction này (snapshot để audit/hiển thị, không phải nguồn chân lý).
- Phân biệt backfill với adjust thủ công bằng **`metadata`** (JSON), KHÔNG bằng chuỗi `description`. Ví dụ backfill: `metadata = {"source":"sync","syncedAt":"..."}`. **Cấm** dùng `description LIKE '%Đồng bộ%'` để nhận diện — dễ vỡ khi đổi ngôn ngữ/nội dung.
- `description` chỉ để hiển thị cho người, không được dùng làm điều kiện logic.

---

## 4. Ranh giới Transaction & race-safety

### Pattern trừ điểm (redeem) — BẮT BUỘC
```ts
// ❌ SAI (race): read-then-write, không guard
const cl = await tx.customerLoyalty.findUnique(...);
if (cl.points < n) throw;
await tx.customerLoyalty.update({ where:{id}, data:{ points:{decrement:n} }});

// ✅ ĐÚNG: guard nguyên tử trong 1 transaction
const res = await tx.customerLoyalty.updateMany({
  where: { id: cl.id, points: { gte: n } },
  data:  { points: { decrement: n }, totalRedeemed: { increment: n } },
});
if (res.count !== 1) throw new InsufficientPointsError();
```

### Ranh giới atomic cho từng thao tác
| Thao tác | Trong CÙNG 1 transaction |
|---|---|
| **Tạo đơn + redeem** | tạo order → trừ điểm (guard) → tạo tx `redeem` → set cột order. Fail bất kỳ bước nào → rollback TẤT CẢ (kể cả order). |
| **Earn** | (đọc tier trước earn) → cộng điểm → tx `earn` → set `loyaltyPointsEarned` → cập nhật metric → eval tier → (nếu lên hạng) tx `tier_upgrade`. Bọc try/catch fail-open Ở NGOÀI (INV-6). |
| **Cancel** | refund redeem (+) → đảo earn (adjust −) → clear cột order. Không giảm totalSpent/totalOrders, không hạ hạng. |

### Chống race earn/tier
- Earn: partial unique index `(orderId) WHERE type='earn'` + kiểm tra tồn tại (INV-4).
- Tier concurrent: khóa hàng `CustomerLoyalty` (interactive tx; nếu cần lock cứng dùng `SELECT ... FOR UPDATE` qua `$queryRaw`). Prisma không hỗ trợ FOR UPDATE trực tiếp — hoặc dùng `isolationLevel: 'Serializable'` cho các tx điểm.

---

## 5. Chính sách Fail-open / Fail-closed (bảng quyết định)

| Điểm gọi | Chính sách | Hành vi khi lỗi |
|---|---|---|
| Redeem lúc tạo đơn | **fail-closed** | Rollback order + trả lỗi (đơn KHÔNG được tạo với giá sai) |
| Sửa đơn làm `finalAmount < 0` | **fail-closed (REJECT)** | Trả 400, yêu cầu staff giảm điểm redeem trước |
| Earn (SALE tạo / RENT trả) | **fail-open** | try/catch, log, đơn vẫn hoàn thành |
| Cancel reverse | **fail-open** | try/catch, log; hủy đơn vẫn thành công |
| Tier upgrade | **fail-open** | Lỗi eval không được chặn earn |

> Lỗi hiện tại cần sửa: `status/route.ts` (RETURNED/CANCELLED) đang chạy hook **không** try/catch → vi phạm INV-6. Phải bọc fail-open.

---

## 6. Tách 2 thao tác: Backfill điểm vs Re-eval hạng

Đây là bài học từ bug `sync-history`. **Không gộp** hai việc bản chất khác nhau:

### 6a. Backfill điểm lịch sử (ledger-based, idempotent)
Mục đích: phát điểm cho đơn CŨ chưa từng earn (thường lúc mới kích hoạt).
```
1. Xóa backfill CŨ: DELETE tx WHERE merchantId=? AND metadata->>'source'='sync'
   (chỉ xóa backfill của chính mình; GIỮ earn/redeem/refund/adjust-thủ-công)
2. Chọn đơn cần backfill: completed/returned VÀ NOT EXISTS(earn tx cho order đó)
   → né double-count với earn real-time
3. Tạo 1 tx 'adjust' (metadata.source='sync') cho tổng điểm backfill mỗi customer
4. DERIVE lại cache từ nguồn đúng (không gán thủ công):
     points        = SUM(ledger.points)
     totalEarned   = SUM(points>0);  totalRedeemed = -SUM(redeem)
     totalSpent    = SUM(orders);    totalOrders   = COUNT(orders)
5. Re-eval tier từ metric
```
Kết quả: chạy lại bao nhiêu lần cũng ra đúng balance (gồm cả earn/redeem real-time xen giữa).

### 6b. Re-eval hạng (an toàn chạy bất cứ lúc nào)
Mục đích: merchant thêm/sửa tier → cần gán lại hạng. **KHÔNG đụng điểm.**
```
1. totalSpent/totalOrders tính lại từ orders (nếu cần)
2. currentTierId = tier cao nhất có threshold <= metric
3. Chỉ ghi tx 'tier_upgrade' nếu LÊN hạng; không hạ (V1)
```

→ Đây là 2 endpoint riêng: `POST /loyalty/backfill-history` và `POST /loyalty/reevaluate-tiers`. Việc "ngày 10 thêm tier" là **re-eval hạng**, KHÔNG phải backfill.

### 6c. Thủ tục "recalculate balance" (Req 12.5)
Chính là bước 4 của backfill, tách riêng thành admin action: derive toàn bộ cache từ ledger + orders. Vì INV-1, thủ tục này luôn cho kết quả đúng và có thể chạy để tự chữa lệch cache.

---

## 7. Feature gating & hiệu năng

- **Nơi check:** mọi endpoint `/api/loyalty/*` gọi `assertLoyaltyFeature` (403 nếu thiếu). Mọi hook trong luồng order gọi sau `merchantHasLoyaltyFeature`.
- **Quy tắc perf (INV-7):** trong một request xử lý order, **chỉ resolve plan-features MỘT lần**. Không gọi `merchantHasLoyaltyFeature()` lặp lại ở nhiều nhánh, không gọi cho status change không liên quan (chỉ CANCELLED/RETURNED cần). Ưu tiên đọc features từ merchant/outlet đã load sẵn thay vì query riêng.
- **Bật loyalty là chủ động:** thêm `"loyalty"` vào `plan.features`. Không auto-tạo program (Req 1.7). Gỡ feature = tắt toàn bộ tức thì (dormant), giữ nguyên data.

---

## 8. Contract API & quy ước

- **Response:** dùng `ResponseBuilder.success/error` (đồng nhất repo). Không tự chế shape.
- **Error codes** (máy đọc, không phụ thuộc ngôn ngữ): `INSUFFICIENT_POINTS`, `BELOW_MINIMUM`, `EXCEEDS_MAX_PERCENT`, `EXCEEDS_REMAINING_AMOUNT`, `REDEEM_DISABLED_FOR_ORDER_TYPE`, `PROGRAM_INACTIVE`, `NO_LOYALTY_RECORD`, `PLAN_UPGRADE_REQUIRED`, `REDEEM_EXCEEDS_TOTAL`.
- **Permissions:** `loyalty.view` (xem), `loyalty.manage` (config + tier + backfill + reeval), `loyalty.adjust` (chỉnh điểm thủ công + recalculate). Redeem lúc tạo đơn dùng `orders.create`. Nguồn định nghĩa: `packages/auth/src/permissions.ts` (không phải `core.ts`).
- **Isolation:** mọi query lọc `merchantId` từ `userScope`; không tin `merchantId` từ client.
- **Redeem execution** đi qua `POST/PUT /api/orders` với field `loyaltyRedeem:{points}` — KHÔNG có endpoint execute redeem riêng. `validate-redeem` chỉ để preview (không mutate).

---

## 9. Point Lots & Expiry — trạng thái V1

`LoyaltyPointLot` + `expiry.ts` đã tồn tại trong code, NHƯNG **requirements.md xếp points-expiry vào Phase 2**. Quyết định chuẩn cho V1:

- **QUYẾT ĐỊNH (chốt): V1 BỎ HẲN point lots.** Chỉ dùng ledger. Không ghi `LoyaltyPointLot`, không set `expiresAt`, không cron expiry, không `expiry.ts` trong luồng runtime.
- Ledger là nguồn chân lý duy nhất (INV-1). Point lots + expiry được thêm lại nguyên vẹn ở **Phase 2** cùng cron FIFO — khi đó lot PHẢI reconcile với ledger (`SUM(lot.remainingPoints)` khớp phần balance dương chưa tiêu).
- Hệ quả refactor: gỡ mọi lời gọi tạo/xóa point lot khỏi earn/sync (vd `loyaltyPointLot.deleteMany` trong `sync-history`), giữ lại model + `expiry.ts` như **hạ tầng ngủ** (không import vào runtime V1). **Cấm** để bất kỳ expiry logic nào ảnh hưởng balance ở V1.

---

## 10. Quy ước code & cấu trúc

- **Tách pure / impure:** hàm tính toán thuần (`calcEarn`, `calcMaxRedeemable`, `evaluateTier`) KHÔNG chạm DB → dễ unit test. Hàm mutate nhận `tx` (Prisma transaction client) từ caller, không tự mở transaction (để caller compose atomic với order).
- **File layout `packages/loyalty/src`:** `calc.ts` (pure) · `earn.ts` · `redeem.ts` · `tier.ts` · `order-hooks.ts` (orchestration, nhận tx) · `plan-gate.ts` · `service.ts` (query đọc: summary, transactions) · `constants.ts` · `types.ts`.
- **Không string-match logic** (đã nêu §3): dùng `type` + `metadata`, không `description`.
- **Tiền tệ:** `Float` (đồng nhất `Order.totalAmount`). Điểm: `Int`. Làm tròn earn: `Math.floor` ở bước cuối.
- **Đặt tên tx source:** hằng số trong `constants.ts` (`TX_TYPE`, `TX_SOURCE.SYNC`) — không hard-code chuỗi rải rác.

---

## 11. "Definition of Done" cho mỗi thao tác

Trước khi coi một thao tác điểm là xong, phải thỏa:

- [ ] Sau thao tác, INV-1 đúng (`points === SUM(ledger)`), verify bằng recalculate.
- [ ] Có tx tương ứng trong ledger (không mutate balance "chui").
- [ ] Idempotent nếu chạy lại (earn/redeem/backfill).
- [ ] Race-safe (guard `updateMany` hoặc lock).
- [ ] Đúng chính sách fail-open/closed (§5).
- [ ] Có unit test cho nhánh biên (thiếu điểm, vượt cap, double-run, cancel-sau-earn).
- [ ] Merchant chưa bật loyalty: không đổi hành vi, không query thừa (INV-7).

---

## 12. Bug đã biết cần đưa về chuẩn (khi refactor)

| # | Chỗ | Vi phạm | Chuẩn cần đạt |
|---|---|---|---|
| 1 | `sync-history/route.ts` reset `points=0` rồi gán từ orders | INV-1, INV-3 | Ledger-authoritative + tách backfill/reeval (§6) |
| 2 | `sync-history` gom mọi đơn (double-count đơn đã earn) | INV-4 | `NOT EXISTS earn tx` |
| 3 | `sync-history` nhận diện tx qua `description contains 'Đồng bộ'` | §3 | Dùng `metadata.source='sync'` |
| 4 | `status/route.ts` RETURNED/CANCELLED không try/catch | INV-6 | Bọc fail-open |
| 5 | Redeem dùng `findUnique`+`update` (nếu còn) | INV-5 | Guard `updateMany WHERE points>=N` |
| 6 | Gate check gọi lặp / cho status không liên quan | INV-7 | Resolve features 1 lần, chỉ khi cần |
| 7 | Thiếu luồng edit đơn (Req 7: reject, đổi customer, recalc item) | design | Implement đủ Req 7 |
| 8 | Point lots/expiry mập mờ V1 | §9 | Chốt bỏ hẳn ở V1 |
