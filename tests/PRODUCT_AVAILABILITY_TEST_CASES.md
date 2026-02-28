# Product Availability Test Cases

## Mô tả
Test function để kiểm tra logic product availability với các orders và date ranges khác nhau.

## Test File
`tests/product-availability-overlap.test.ts`

## Cách chạy test
```bash
# Với Jest
npm test tests/product-availability-overlap.test.ts

# Với Vitest
yarn test tests/product-availability-overlap.test.ts
```

---

## Test Cases

### 1. Single Date Mode
**Test:** Check availability cho một ngày cụ thể

**Input:**
- `date`: `"2026-02-27"`
- `productId`: `5339`
- `totalStock`: `10`

**Orders:**
- Order 1: PICKUPED, pickup: 2026-02-25, return: 2026-02-28, quantity: 3
- Order 2: RESERVED, pickup: 2026-02-27, return: 2026-02-29, quantity: 2

**Expected Result:**
- `totalRented`: 3 (Order 1)
- `totalReserved`: 2 (Order 2)
- `totalAvailable`: 5 (10 - 3 - 2)
- `isAvailable`: true

---

### 2. Rental Period Mode - Basic Overlap
**Test:** Check availability cho rental period (pickupDate to returnDate)

**Input:**
- `pickupDate`: `"2026-02-26"`
- `returnDate`: `"2026-02-28"`
- `productId`: `5339`
- `totalStock`: `10`

**Orders:**
- Order 1: PICKUPED, pickup: 2026-02-25, return: 2026-02-27, quantity: 3 ✅ Overlap
- Order 2: RESERVED, pickup: 2026-02-27, return: 2026-02-29, quantity: 2 ✅ Overlap
- Order 3: RESERVED, pickup: 2026-02-24, return: 2026-02-30, quantity: 1 ✅ Span across
- Order 4: RETURNED, pickup: 2026-02-20, return: 2026-02-24, quantity: 5 ❌ No overlap
- Order 5: RESERVED, pickup: 2026-03-01, return: 2026-03-05, quantity: 4 ❌ No overlap

**Expected Result:**
- `totalRented`: 3 (Order 1)
- `totalReserved`: 3 (Order 2: 2 + Order 3: 1)
- `totalAvailable`: 4 (10 - 3 - 3)
- `activeOrders.length`: 3 (Order 1, 2, 3)

---

### 3. Order Starts Before, Ends During Period
**Test:** Order bắt đầu trước period, kết thúc trong period

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-28"`

**Orders:**
- Order: PICKUPED, pickup: 2026-02-25, return: 2026-02-27, quantity: 5

**Expected Result:**
- `totalRented`: 5
- `totalAvailable`: 5
- `activeOrders.length`: 1

---

### 4. Order Starts During, Ends After Period
**Test:** Order bắt đầu trong period, kết thúc sau period

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-28"`

**Orders:**
- Order: RESERVED, pickup: 2026-02-28, return: 2026-03-02, quantity: 4

**Expected Result:**
- `totalReserved`: 4
- `totalAvailable`: 6
- `activeOrders.length`: 1

---

### 5. Order Spans Entire Period
**Test:** Order bao trùm toàn bộ period

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-28"`

**Orders:**
- Order: PICKUPED, pickup: 2026-02-20, return: 2026-03-05, quantity: 7

**Expected Result:**
- `totalRented`: 7
- `totalAvailable`: 3
- `activeOrders.length`: 1

---

### 6. Out of Stock Scenario
**Test:** Không còn sản phẩm available

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-28"`
- `totalStock`: `10`

**Orders:**
- Order 1: PICKUPED, pickup: 2026-02-25, return: 2026-02-29, quantity: 6
- Order 2: RESERVED, pickup: 2026-02-27, return: 2026-02-28, quantity: 5

**Expected Result:**
- `totalRented`: 6
- `totalReserved`: 5
- `totalAvailable`: 0 (10 - 6 - 5 = -1, max(0, -1) = 0)
- `isAvailable`: false

---

### 7. SALE Orders
**Test:** Xử lý SALE orders đúng cách

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-28"`

**Orders:**
- Order 1: SALE RESERVED, pickup: 2026-02-27, quantity: 3 ✅ Counts
- Order 2: SALE COMPLETED, pickup: 2026-02-26, quantity: 2 ❌ Doesn't count (already reduced stock)

**Expected Result:**
- `totalRented`: 0 (SALE orders don't count as rented)
- `totalReserved`: 3 (Only RESERVED SALE counts)
- `totalAvailable`: 7 (10 - 0 - 3)

---

### 8. Edge Cases

#### 8.1 Same-Day Rental
**Test:** Thuê trong cùng một ngày

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-27"` (same day)

**Orders:**
- Order: PICKUPED, pickup: 2026-02-27, return: 2026-02-27, quantity: 2

**Expected Result:**
- `totalRented`: 2
- `totalAvailable`: 8

#### 8.2 Orders Without Return Date
**Test:** Order không có return date

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-28"`

**Orders:**
- Order: PICKUPED, pickup: 2026-02-25, return: null, quantity: 3

**Expected Result:**
- `totalRented`: 3 (PICKUPED without return date = still active)
- `activeOrders.length`: 1

#### 8.3 RETURNED Orders
**Test:** RETURNED orders không được tính

**Input:**
- `pickupDate`: `"2026-02-27"`
- `returnDate`: `"2026-02-28"`

**Orders:**
- Order: RETURNED, pickup: 2026-02-25, return: 2026-02-27, quantity: 2

**Expected Result:**
- `totalRented`: 0 (RETURNED orders don't count)
- `totalReserved`: 0
- `totalAvailable`: 10

---

## Test Function Structure

```typescript
calculateProductAvailability(
  totalStock: number,
  orders: Array<Order>,
  productId: number,
  startOfPeriod: Date,
  endOfPeriod: Date
): {
  totalStock: number;
  totalRented: number;
  totalReserved: number;
  totalAvailable: number;
  isAvailable: boolean;
  activeOrders: Order[];
}
```

## Overlap Logic

Order được coi là **active** (overlap) nếu:
1. Order pickup date trong requested period, HOẶC
2. Order return date trong requested period, HOẶC
3. Order span across requested period (pickup trước start, return sau end)

### Status Rules:
- **PICKUPED**: Active nếu return date >= start of period (hoặc không có return date)
- **RESERVED**: Active nếu rental period overlap với requested period
- **RETURNED**: Không được tính (đã trả)
- **SALE RESERVED**: Được tính (chưa hoàn thành)
- **SALE COMPLETED**: Không được tính (đã giảm stock)

---

## Example Usage

```typescript
// Setup test data
const productId = 5339;
const totalStock = 10;

const orders = [
  {
    orderType: 'RENT',
    status: 'PICKUPED',
    pickupPlanAt: '2026-02-25T10:00:00.000Z',
    returnPlanAt: '2026-02-28T17:00:00.000Z',
    orderItems: [{ productId: 5339, quantity: 3 }]
  }
];

// Test single date
const startOfPeriod = new Date('2026-02-27T00:00:00.000Z');
const endOfPeriod = new Date('2026-02-27T23:59:59.999Z');

const result = calculateProductAvailability(
  totalStock,
  orders,
  productId,
  startOfPeriod,
  endOfPeriod
);

console.log(result);
// {
//   totalStock: 10,
//   totalRented: 3,
//   totalReserved: 0,
//   totalAvailable: 7,
//   isAvailable: true,
//   activeOrders: [...]
// }
```

---

## Notes

1. Tất cả dates được normalize về UTC để so sánh chính xác
2. `totalAvailable = max(0, totalStock - totalRented - totalReserved)`
3. SALE orders chỉ tính RESERVED status
4. RETURNED orders không được tính vào availability
