# Requirements Document — Loyalty Program

## Introduction

Module Loyalty Program cho phép merchant (plan Professional+) tạo chương trình tích điểm và đổi điểm cho khách hàng. Hệ thống có 2 flow chính:

1. **Tạo đơn → Giảm giá bằng điểm (redeem)**: Staff chọn dùng điểm tích lũy của customer để giảm giá đơn hàng
2. **Hoàn thành đơn → Tích điểm + upgrade hạng (earn)**: Khi đơn hoàn thành (SALE = tạo đơn, RENT = trả đồ), hệ thống tự tích điểm và kiểm tra nâng hạng

**Architecture decisions:**
- Toàn bộ cấu hình loyalty (earn, redeem, tier) ở **merchant level**
- Points balance ở **merchant level** (shared across outlets cùng merchant)
- Transactions ghi nhận outletId để trace nguồn gốc
- Tách biệt hoàn toàn với Promotion module (future)
- Loyalty discount giảm `amountDue`, KHÔNG tạo Payment record

**Existing context:**
- Order model đã có `discountType`, `discountValue`, `discountAmount` cho manual discount (staff nhập tay)
- Loyalty discount dùng fields MỚI riêng: `loyaltyPointsRedeemed`, `loyaltyDiscount`
- Hai loại discount cộng dồn, không conflict

## Glossary

- **Loyalty_Program**: Cấu hình chương trình loyalty của một merchant (earn rates, redeem settings, tier config)
- **Loyalty_Tier**: Hạng thành viên do merchant tự define (tên, ngưỡng, hệ số nhân earn)
- **Customer_Loyalty**: Record balance điểm + hạng của một customer tại một merchant
- **Loyalty_Transaction**: Giao dịch điểm (earn/redeem/adjust/refund) — immutable ledger
- **Earn**: Tích điểm khi đơn hoàn thành. SALE = ngay khi tạo (COMPLETED). RENT = khi trả đồ (RETURNED)
- **Redeem**: Staff chọn dùng X điểm → giảm Y đồng trên đơn. Manual, không tự động
- **Tier_Metric**: Tiêu chí xếp hạng: total_spend hoặc total_orders (merchant chọn)
- **Eligible_Amount**: Số tiền dùng để tính earn = subtotal - discountAmount - loyaltyDiscount
- **Final_Amount**: Số tiền khách thực trả = subtotal - discountAmount - loyaltyDiscount
- **Staff_User**: User có role MERCHANT, OUTLET_ADMIN, hoặc OUTLET_STAFF

## Requirements

### Requirement 1: Loyalty Program Configuration (Merchant-level)

**User Story:** As a Merchant, I want to configure a loyalty program for my business with custom earn rates for rental and sale orders, so that I can reward customers appropriately based on order type.

#### Acceptance Criteria

1. THE system SHALL allow users with role MERCHANT to create and configure ONE Loyalty_Program per merchant
2. THE Loyalty_Program SHALL be configurable with separate earn rates for RENT and SALE orders:
   - `rentEarnEnabled` (boolean): whether RENT orders earn points
   - `rentEarnRate` (int): points earned per threshold (default: 1)
   - `rentEarnPerAmount` (float): spend threshold for 1 earn unit (e.g., 10,000đ = 1 point)
   - `saleEarnEnabled` (boolean): whether SALE orders earn points
   - `saleEarnRate` (int): points earned per threshold (default: 1)
   - `saleEarnPerAmount` (float): spend threshold for 1 earn unit (e.g., 10,000đ = 1 point)
3. THE Loyalty_Program SHALL be configurable with redeem settings:
   - `pointValue` (float): monetary value of 1 point when redeeming (e.g., 1 point = 1,000đ discount)
   - `minRedeemPoints` (int): minimum points required to redeem (e.g., 10)
   - `maxRedeemPercent` (float): maximum discount as percentage of subtotal (e.g., 50%)
   - `redeemOnRent` (boolean): whether points can be redeemed on RENT orders
   - `redeemOnSale` (boolean): whether points can be redeemed on SALE orders
4. THE system SHALL validate: earnRate > 0, earnPerAmount > 0, pointValue > 0, maxRedeemPercent between 1-100
5. THE system SHALL allow merchant to enable/disable the entire program via `isActive` flag
6. WHEN the program is disabled (isActive=false), THE system SHALL freeze all earn and redeem operations but preserve existing data (points, tiers, transactions)
7. WHEN a new merchant is created (Professional+ plan), THE system SHALL NOT auto-create a loyalty program. Merchant must explicitly set up the program

### Requirement 2: Tier Configuration (Merchant-level, Configurable)

**User Story:** As a Merchant, I want to define custom membership tiers with flexible criteria, so that I can segment customers and reward VIPs with faster point earning.

#### Acceptance Criteria

1. THE system SHALL allow merchant to define unlimited tiers, each with: name (string), threshold (float, min metric value to qualify), multiplier (float, earn multiplier), color (string), icon (string), sortOrder (int)
2. THE system SHALL require minimum 1 tier with threshold = 0 (default tier for all new customers). THE system SHALL NOT allow deletion of the last remaining tier
3. THE system SHALL support configurable `tierMetric` on the program:
   - `total_spend`: Total monetary spend across all outlets (uses CustomerLoyalty.totalSpent)
   - `total_orders`: Total completed orders across all outlets (uses CustomerLoyalty.totalOrders)
4. V1: Tier period = `lifetime` only. Metric (totalSpent / totalOrders) accumulates forever and never resets. Configurable `yearly` reset is Phase 2 (requires separate year-scoped counters not present in V1 data model)
5. V1: Tier downgrade policy = `never` (customers only go up, never down). Configurable downgrade is Phase 2
6. V1: Tier benefits field = display-only text/JSON (shown to staff). No auto-apply discounts from tier. Auto-discount by tier is Phase 2
7. THE tier multiplier SHALL multiply the base earn points (e.g., Gold x1.5 = 50% more points earned)
8. WHEN merchant edits tier thresholds, existing customers SHALL retain their current tier. New thresholds apply only at next tier evaluation
9. WHEN merchant deletes a tier, customers at that tier SHALL be moved to the nearest lower tier
10. WHEN merchant changes `tierMetric` (total_spend → total_orders), THE system SHALL re-evaluate all customers and require confirmation showing number of affected customers

### Requirement 3: Order Pricing with Loyalty Discount

**User Story:** As a Staff User, I want the order total to correctly account for loyalty discount alongside manual discount, so that the customer pays the right amount.

#### Acceptance Criteria

1. THE order pricing formula SHALL be:
   ```
   subtotal        = SUM(orderItems.totalPrice)
   discountAmount  = manual discount by staff (existing fields)
   loyaltyDiscount = redeemedPoints × pointValue (NEW field)
   finalAmount     = subtotal - discountAmount - loyaltyDiscount
   ```
2. THE system SHALL enforce: `finalAmount >= 0` at all times
3. THE system SHALL enforce: `loyaltyDiscount <= subtotal - discountAmount` (loyalty cannot make order negative)
4. THE system SHALL enforce: `loyaltyDiscount <= subtotal × (maxRedeemPercent / 100)` (percentage cap on original subtotal)
5. THE loyalty discount SHALL reduce the amount due (`amountDue = finalAmount`). It SHALL NOT create a Payment record — it is a discount, not a payment
6. WHEN calculating remaining balance: `remaining = finalAmount - totalPaid` (where totalPaid = SUM of actual payments)
7. THE Order model SHALL store new fields:
   - `loyaltyPointsRedeemed` (int, nullable): number of points used
   - `loyaltyDiscount` (float, nullable): monetary discount from loyalty
   - `loyaltyPointsEarned` (int, nullable): points earned from this order (filled on completion)
8. THE existing `discountAmount` (manual) and new `loyaltyDiscount` are INDEPENDENT and stack additively

### Requirement 4: Redeeming Points When Creating Order

**User Story:** As a Staff User, I want to apply a loyalty discount by using the customer's accumulated points when creating an order, so that returning customers get savings.

#### Acceptance Criteria

1. WHEN staff selects a customer in the order form, THE client SHALL fetch and display: current points balance, tier name + color, whether redeem is available for this order type
2. THE order creation form SHALL display a "Dùng điểm" section (toggle, default OFF) with:
   - Current balance display
   - Input field for number of points to redeem
   - Calculated discount amount (points × pointValue)
   - Max allowed display (min of: balance, maxRedeemPercent cap, remaining after manual discount)
3. THE order creation API (POST /api/orders) SHALL accept optional field: `loyaltyRedeem: { points: N }`
4. THE system SHALL validate redeem on server:
   - Customer has sufficient balance (points >= requested)
   - Requested points >= `minRedeemPoints`
   - Calculated discount <= subtotal × maxRedeemPercent / 100
   - `redeemOnRent` = true for RENT orders / `redeemOnSale` = true for SALE orders
   - finalAmount (after all discounts) >= 0
   - Loyalty program isActive = true
5. WHEN validation passes, THE system SHALL atomically (in DB transaction):
   - Deduct points from CustomerLoyalty.points
   - Create LoyaltyTransaction type="redeem" (negative points, balanceAfter)
   - Set order.loyaltyPointsRedeemed and order.loyaltyDiscount
6. THE system SHALL use DB transaction with balance check (`WHERE points >= N`) to prevent race conditions
7. WHEN staff does NOT include `loyaltyRedeem`, THE system SHALL NOT apply any loyalty discount (explicit opt-in only)
8. WHEN customer has no CustomerLoyalty record or 0 points, THE UI SHALL show "0 điểm" and disable the redeem toggle

### Requirement 5: Earning Points on Order Completion

**User Story:** As a system, I want to automatically calculate and award loyalty points when an order is completed, so that customers are rewarded and can accumulate toward tier upgrades.

#### Acceptance Criteria

1. FOR SALE orders: THE system SHALL award points immediately when order is created (status = COMPLETED)
2. FOR RENT orders: THE system SHALL award points when order status changes to RETURNED
3. THE earn calculation SHALL be:
   ```
   eligibleAmount = subtotal - discountAmount - loyaltyDiscount (= finalAmount)
   basePoints     = floor(eligibleAmount / earnPerAmount) × earnRate
   earnedPoints   = floor(basePoints × tierMultiplier)
   ```
   - Use RENT or SALE earn config based on `order.orderType`
   - `tierMultiplier` = customer's current tier multiplier at earn time
4. THE system SHALL use earn config (rate, earnPerAmount) and tier multiplier valid at the TIME OF EARN:
   - SALE: at order creation time
   - RENT: at return time (when status → RETURNED)
5. WHEN customer has no assigned customer on the order (customerId = null), THE system SHALL NOT award points
6. THE system SHALL store `loyaltyPointsEarned` on the Order record
7. THE system SHALL create LoyaltyTransaction type="earn" with orderId, outletId, points (positive), balanceAfter
8. THE system SHALL update CustomerLoyalty: points += earned, totalEarned += earned, totalSpent += subtotal, totalOrders += 1
   - DECISION: `totalSpent` uses **gross subtotal** (original amount BEFORE manual discount & loyalty redeem), NOT finalAmount. This is intentional — tier metric rewards total business volume, so redeeming points does not slow down tier progression
   - `subtotal` here EXCLUDES lateFee and damageFee (penalties are never counted toward tier metric, consistent with earn eligibility in 5.13)
9. THE system SHALL check for tier upgrade after earn (Requirement 6)
10. WHEN earnEnabled = false for the order type, THE system SHALL skip earn (no transaction)
11. WHEN eligibleAmount <= 0, THE system SHALL skip earn (0 points)
12. THE system SHALL prevent duplicate earn: check if LoyaltyTransaction with same orderId + type="earn" exists → skip
13. FOR RENT orders, lateFee and damageFee (added at return time) SHALL NOT be included in eligibleAmount. Earn is calculated on the original rental amount only

### Requirement 6: Tier Upgrade on Earn

**User Story:** As a system, I want to automatically upgrade customer tier when they reach a new threshold, so that loyal customers are promoted promptly.

#### Acceptance Criteria

1. THE system SHALL evaluate tier after every earn transaction (when totalSpent or totalOrders is updated)
2. THE system SHALL find the highest tier where `threshold <= customer's current tierMetric value`
3. IF the qualifying tier is higher than current tier:
   - Update CustomerLoyalty.currentTierId
   - Create LoyaltyTransaction type="tier_upgrade" (points=0, metadata with fromTier/toTier names)
4. V1: Tier NEVER downgrades. Even if metric is recalculated lower (cancel), customer keeps their tier
5. THE earn multiplier used for a transaction SHALL be the customer's tier BEFORE the earn. Upgraded multiplier applies starting NEXT transaction
6. WHEN two orders complete concurrently pushing past same threshold, THE system SHALL use DB row-level lock on CustomerLoyalty to ensure only one upgrade

### Requirement 7: Order Edit — Loyalty Adjustments

**User Story:** As a Staff User, I want loyalty to be correctly adjusted when I edit an order, so that points remain accurate.

#### Acceptance Criteria

1. WHEN staff edits an order that has redeemed points AND changes totalAmount/items:
   - DECISION: IF new finalAmount < 0 after existing loyaltyDiscount → **REJECT the edit** with a clear error (e.g., "Giá trị đơn nhỏ hơn số điểm đã dùng. Vui lòng giảm số điểm quy đổi trước."). The system does NOT auto-reduce redeem silently
   - THE system SHALL NOT auto-recalculate redeem. Staff must manually reduce/remove redeemed points, then retry the edit
2. WHEN order status changes to CANCELLED:
   - IF order had redeemed points: refund with LoyaltyTransaction type="refund" (+points back)
   - IF order had earned points: reverse with LoyaltyTransaction type="adjust" (-points)
   - Update CustomerLoyalty.points for both
   - DO NOT downgrade tier (v1: never downgrade)
   - `totalSpent` and `totalOrders` on CustomerLoyalty: DO NOT decrement on cancel (keeps tier stable)
3. WHEN order's customerId changes on an order that has loyalty transactions:
   - Reverse all loyalty for old customer (refund redeem, reverse earn)
   - DO NOT auto-apply loyalty for new customer. Staff must re-apply redeem manually
   - Earn for new customer will happen at normal completion trigger
4. WHEN RENT order status changes to RETURNED → trigger earn (Requirement 5)
5. WHEN staff edits items on a SALE order that already earned points:
   - Recalculate earn based on new eligibleAmount
   - Create LoyaltyTransaction type="adjust" with difference (+/- points)
   - Update CustomerLoyalty.points accordingly

### Requirement 8: Customer Loyalty Display

**User Story:** As a Staff User, I want to see a customer's loyalty status clearly when creating orders and viewing customer details, so I can communicate value to the customer.

#### Acceptance Criteria

1. THE customer detail page SHALL have a "Loyalty" section showing: current points, tier (name + color + icon), totalSpent, totalOrders, transaction history (paginated)
2. THE order creation form SHALL show loyalty info when customer is selected: tier badge, points balance, earn preview
3. FOR RENT orders, THE earn preview SHALL display as estimate: "Ước tính tích ~X điểm khi trả đồ" (since earn happens at return time, current rate/tier may change)
4. FOR SALE orders, THE earn preview SHALL display exact: "Tích X điểm" (earn happens immediately)
5. THE order detail page SHALL show: points redeemed, loyalty discount amount, points earned (if completed)
6. WHEN viewing customer list or order list, THE system SHALL show tier badge next to customer name

### Requirement 9: Loyalty Management UI

**User Story:** As a Merchant, I want a dedicated settings page to configure the loyalty program, tiers, and view statistics.

#### Acceptance Criteria

1. THE client app SHALL have a "Loyalty" section in Settings (visible only to MERCHANT role with Professional+ plan)
2. THE page SHALL have tabs: "Cấu hình" (program config), "Hạng thành viên" (tiers)
3. THE "Cấu hình" tab SHALL allow editing: earn rates (RENT/SALE separately), redeem settings, enable/disable toggle
4. THE "Hạng thành viên" tab SHALL allow: add/edit/delete/reorder tiers, configure tierMetric (total_spend / total_orders). Tier period is fixed to `lifetime` in V1 (no UI control)
5. OUTLET_ADMIN and OUTLET_STAFF SHALL have read-only access to customer loyalty data (cannot modify program configuration)
6. Permission model:
   - `loyalty.manage`: CRUD program + tier config (MERCHANT only)
   - `loyalty.view`: View customer loyalty info (MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
   - `loyalty.adjust`: Manual point adjustment with reason (MERCHANT only)

### Requirement 10: Plan Gating

**User Story:** As a system administrator, I want loyalty to only be available for Professional plan merchants.

#### Acceptance Criteria

1. THE Loyalty Program feature SHALL only be accessible to merchants whose Plan.features includes "loyalty"
2. WHEN a Basic/Free plan merchant accesses loyalty endpoints, THE system SHALL return 403 with upgrade message
3. WHEN a merchant downgrades plan: deactivate program (isActive=false), preserve all data. Upgrade reactivates
4. THE client SHALL conditionally render loyalty UI elements only for eligible plans
5. WHEN merchant is on trial period: loyalty IS accessible (trial includes all Professional features)
6. WHEN subscription is expired/past_due: loyalty access follows same rules as other features (existing subscription middleware)

### Requirement 11: API Endpoints

**User Story:** As a developer, I want well-defined API endpoints for all loyalty operations.

#### Acceptance Criteria

1. `GET /api/loyalty/program` — Get program config (loyalty.view). Returns null if not set up
2. `PUT /api/loyalty/program` — Create or update program config (loyalty.manage)
3. `GET /api/loyalty/tiers` — List tiers sorted by sortOrder (loyalty.view)
4. `POST /api/loyalty/tiers` — Create tier (loyalty.manage)
5. `PUT /api/loyalty/tiers/[id]` — Update tier (loyalty.manage)
6. `DELETE /api/loyalty/tiers/[id]` — Delete tier, move customers to lower tier (loyalty.manage)
7. `GET /api/loyalty/customers/[id]/summary` — Points, tier, redeemability check (loyalty.view)
8. `GET /api/loyalty/customers/[id]/transactions` — Paginated transaction history (loyalty.view)
9. `POST /api/loyalty/validate-redeem` — Validate redeem without executing. Body: { customerId, points, orderTotal, orderType }. Returns: { valid, maxPoints, maxDiscount, reason? } (orders.create)
10. `POST /api/loyalty/adjust` — Manual point adjustment with reason (loyalty.adjust). Body: { customerId, points (+/-), reason }
11. ALL endpoints SHALL enforce merchant isolation
12. ALL endpoints SHALL check plan feature gating
13. Order creation (POST /api/orders) and update (PUT /api/orders/[id]) SHALL accept `loyaltyRedeem: { points }` field — no separate endpoint needed for redeem execution

### Requirement 12: Edge Cases & Data Integrity

**User Story:** As a system operator, I want the loyalty engine to handle edge cases gracefully.

#### Acceptance Criteria

1. THE system SHALL prevent duplicate earn: unique check on (orderId, type="earn") in LoyaltyTransaction
2. THE system SHALL allow negative balance (from reversals). UI shows warning. Cannot redeem when balance <= 0
3. WHEN the loyalty engine errors during earn, THE order SHALL still complete (fail-open). Error logged
4. Earn and redeem SHALL execute within a single DB transaction for atomicity
5. THE system SHALL provide a "recalculate balance" admin action (loyalty.adjust) that re-derives points from SUM(transactions)
6. WHEN order totalAmount = 0 (free order), skip earn AND skip redeem (nothing to discount)
7. THE system SHALL handle concurrent operations via DB row-level locking on CustomerLoyalty
8. WHEN program is inactive, ALL earn/redeem calls return error — orders still process without loyalty
9. WHEN customer is assigned to order AFTER creation (retroactive): trigger earn if order is already completed/returned
10. Auto-create CustomerLoyalty record (points=0, default tier) on first lookup — no explicit "join" step needed
11. FOR RENT earn: use earn rate and tier multiplier AT TIME OF RETURN (not order creation time). Campaign rules with time-bound logic use snapshot from order creation (Phase 2)

## Out of Scope (Phase 2+)

The following features are explicitly NOT in v1 but the schema/architecture should not block them:

| Feature | Phase | Notes |
|---------|-------|-------|
| **Tier auto-discount %** | Phase 2 | Hạng Gold tự giảm 5% mọi đơn (tier.discountPercent field reserved) |
| **Campaign rules / LoyaltyRule** | Phase 2 | Time-bound rules: x2 Tết, sinh nhật bonus. Includes rule snapshot on RENT orders |
| **Points expiry (per_transaction, yearly_reset)** | Phase 2 | Point lot model, FIFO expiry, cron job. V1 = points never expire |
| **Tier period `yearly` reset** | Phase 2 | Year-scoped metric counters + reset cron. V1 = `lifetime` only |
| **Promotion module** | Separate | Auto-apply discount rules. Completely separate from loyalty |
| **Tier downgrade** | Phase 2 | immediate / grace_30d policies. V1 = never downgrade |
| **Mobile loyalty UI** | Phase 2 | V1 = web client only. Mobile orders still earn points server-side |
| **Outlet-scoped rules** | Phase 2 | OUTLET_ADMIN creating rules for their outlet only |
| **Referral bonus** | Phase 3 | Earn points for referring new customers |
| **Audit log integration** | Phase 2 | Detailed audit trail for loyalty admin actions |
| **Points transfer between customers** | Not planned | Out of scope |

## Appendix: Order Pricing Formula

```
┌─────────────────────────────────────────────────────────────┐
│ ORDER PRICING (with loyalty)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ subtotal        = SUM(orderItems.totalPrice)                │
│                                                              │
│ discountAmount  = manual discount (existing, staff nhập)    │
│ loyaltyDiscount = loyaltyPointsRedeemed × pointValue  (NEW) │
│                                                              │
│ finalAmount     = subtotal - discountAmount - loyaltyDiscount│
│                   (must be >= 0)                             │
│                                                              │
│ amountDue       = finalAmount                               │
│ totalPaid       = SUM(payments.amount)                      │
│ remaining       = amountDue - totalPaid                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ EARN CALCULATION (on completion):                            │
│                                                              │
│ eligibleAmount  = finalAmount                               │
│                   (= subtotal - discountAmount - loyaltyDisc)│
│                                                              │
│ basePoints      = floor(eligibleAmount / earnPerAmount)      │
│                   × earnRate                                 │
│                                                              │
│ earnedPoints    = floor(basePoints × tier.multiplier)        │
│                                                              │
│ NOTE: lateFee and damageFee are NOT included in eligible    │
│       (they are penalties, not rental revenue)              │
├─────────────────────────────────────────────────────────────┤
│ REDEEM VALIDATION:                                           │
│                                                              │
│ maxByBalance    = customerLoyalty.points                     │
│ maxByPercent    = floor(subtotal × maxRedeemPercent / 100   │
│                   / pointValue)                              │
│ maxByRemaining  = floor((subtotal - discountAmount)         │
│                   / pointValue)                              │
│ maxRedeemable   = min(maxByBalance, maxByPercent,           │
│                       maxByRemaining)                        │
│                                                              │
│ Validate: requestedPoints >= minRedeemPoints                │
│ Validate: requestedPoints <= maxRedeemable                  │
└─────────────────────────────────────────────────────────────┘
```

## Appendix: Earn Timing

| Order Type | Earn Trigger | Reason |
|-----------|-------------|--------|
| SALE | Immediately on create (status=COMPLETED) | Transaction complete, goods delivered |
| RENT | When status → RETURNED | Confirm customer returned items, rental complete |

## Appendix: New Order Fields

```
Order {
  // Existing (unchanged):
  totalAmount         Float       // = subtotal
  discountType        String?     // Manual discount type
  discountValue       Float       // Manual discount value
  discountAmount      Float       // Manual discount calculated amount
  
  // NEW loyalty fields:
  loyaltyPointsRedeemed  Int?     // Points used for discount (null = no redeem)
  loyaltyDiscount        Float?   // Monetary discount from loyalty (null = none)
  loyaltyPointsEarned    Int?     // Points earned from this order (null = not yet earned / no customer)
}
```
