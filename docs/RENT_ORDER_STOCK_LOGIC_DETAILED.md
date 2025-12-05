# RENT Order Stock Logic - Chi Tiết & Ví Dụ

## 🎯 Mục Tiêu Của OutletStock

### OutletStock Model
```prisma
model OutletStock {
  stock     Int  @default(0)  // Số lượng thực tế trong kho outlet (vĩnh viễn)
  available Int  @default(0)  // Số lượng có sẵn để cho thuê = stock - renting
  renting   Int  @default(0)  // Số lượng đang cho thuê (tạm thời, sẽ trả lại)
}
```

### Mục Tiêu:
1. **`stock`**: Số lượng thực tế trong kho outlet (không đổi khi cho thuê, chỉ đổi khi bán hoặc nhập/xuất kho)
2. **`renting`**: Số lượng đang cho thuê (tạm thời, tăng khi PICKUPED, giảm khi RETURNED)
3. **`available`**: Số lượng có sẵn để cho thuê = `stock - renting`

### Công Thức:
```
available = stock - renting
```

**Lưu ý**: 
- `stock` không đổi khi cho thuê (vì sẽ trả lại)
- `renting` tăng/giảm tạm thời khi cho thuê
- **`reserved` KHÔNG được tính vào `available`** vì reserved items vẫn còn trong kho
- Reserved chỉ được check trong Availability API khi có ngày (date-based conflicts)

---

## 📋 Logic Khi Tạo Đơn Hàng Thuê (RENT Order)

### Khi Tạo Order Mới

**Location**: `apps/api/app/api/orders/route.ts` (POST handler)

**Initial Status**: `RESERVED` (cho RENT orders)

**Logic**:
```typescript
// Khi tạo RENT order mới với status RESERVED
const initialStatus = ORDER_STATUS.RESERVED; // Cho RENT orders

// Sau khi tạo order, gọi updateOutletStockForOrder
if (order.orderType === ORDER_TYPE.RENT && 
    (order.status === ORDER_STATUS.RESERVED || order.status === ORDER_STATUS.PICKUPED)) {
  await updateOutletStockForOrder(
    order.id,
    null, // oldStatus (null cho order mới)
    ORDER_STATUS.RESERVED,
    'RENT',
    order.outletId,
    orderItems
  );
}
```

**Kết Quả**:
- `stock`: **Không đổi** (vẫn giữ nguyên)
- `renting`: **Không đổi** (vẫn = 0, chưa pickup)
- `available`: **Giảm** `-quantity` (reserve tạm thời)

---

## 🔄 Logic Update Stock Khi Order Status Thay Đổi

### Location: `packages/database/src/product.ts` - `updateOutletStockForOrder`

### 1. RENT Order: RESERVED Status

**Khi tạo order mới hoặc chuyển status → RESERVED:**

```typescript
if (newStatus === ORDER_STATUS.RESERVED) {
  if (oldStatus !== ORDER_STATUS.RESERVED && oldStatus !== ORDER_STATUS.PICKUPED) {
    availableChange = -item.quantity;  // ✅ Giảm available (reserve tạm thời)
    // stock không đổi
    // renting không đổi (chưa pickup)
  }
}
```

**Ví Dụ**:
- **Trước**: `stock = 10`, `renting = 0`, `available = 10`
- **Tạo RENT order với quantity = 2, status = RESERVED**
- **Sau**: `stock = 10`, `renting = 0`, `available = 8` ✅

**Công Thức**:
```
available = stock - renting - reserved
available = 10 - 0 - 2 = 8
```

---

### 2. RENT Order: RESERVED → PICKUPED

**Khi chuyển status từ RESERVED → PICKUPED:**

```typescript
if (newStatus === ORDER_STATUS.PICKUPED) {
  if (oldStatus === ORDER_STATUS.RESERVED) {
    rentingChange = item.quantity;      // ✅ Tăng renting
    // availableChange = 0 (đã giảm trong RESERVED rồi)
  } else {
    // Từ status khác (ví dụ: trực tiếp tạo với PICKUPED)
    rentingChange = item.quantity;      // ✅ Tăng renting
    availableChange = -item.quantity;   // ✅ Giảm available
  }
}
```

**Ví Dụ**:
- **Trước**: `stock = 10`, `renting = 0`, `available = 8` (đã reserve 2)
- **Chuyển RESERVED → PICKUPED với quantity = 2**
- **Sau**: `stock = 10`, `renting = 2`, `available = 8` ✅

**Công Thức**:
```
available = stock - renting - reserved
available = 10 - 2 - 0 = 8
```

**Lưu ý**: `available` không đổi vì đã giảm trong RESERVED rồi, bây giờ chỉ tăng `renting`.

---

### 3. RENT Order: PICKUPED → RETURNED

**Khi chuyển status từ PICKUPED → RETURNED:**

```typescript
if (newStatus === ORDER_STATUS.RETURNED) {
  if (oldStatus === ORDER_STATUS.PICKUPED) {
    rentingChange = -item.quantity;     // ✅ Giảm renting
    availableChange = item.quantity;    // ✅ Tăng available (trả lại kho)
  }
}
```

**Ví Dụ**:
- **Trước**: `stock = 10`, `renting = 2`, `available = 8`
- **Chuyển PICKUPED → RETURNED với quantity = 2**
- **Sau**: `stock = 10`, `renting = 0`, `available = 10` ✅

**Công Thức**:
```
available = stock - renting - reserved
available = 10 - 0 - 0 = 10
```

**Lưu ý**: Khi RETURNED, `renting` giảm và `available` tăng lại (trả lại kho).

---

### 4. RENT Order: PICKUPED → CANCELLED

**Khi chuyển status từ PICKUPED → CANCELLED:**

```typescript
if (newStatus === ORDER_STATUS.CANCELLED) {
  if (oldStatus === ORDER_STATUS.PICKUPED) {
    rentingChange = -item.quantity;     // ✅ Hoàn lại renting
    availableChange = item.quantity;    // ✅ Hoàn lại available
  }
}
```

**Ví Dụ**:
- **Trước**: `stock = 10`, `renting = 2`, `available = 8`
- **Chuyển PICKUPED → CANCELLED với quantity = 2**
- **Sau**: `stock = 10`, `renting = 0`, `available = 10` ✅

---

### 5. RENT Order: RESERVED → CANCELLED

**Khi chuyển status từ RESERVED → CANCELLED:**

```typescript
if (newStatus === ORDER_STATUS.CANCELLED) {
  if (oldStatus === ORDER_STATUS.RESERVED) {
    availableChange = item.quantity;    // ✅ Hoàn lại available
    // renting không đổi (chưa pickup)
  }
}
```

**Ví Dụ**:
- **Trước**: `stock = 10`, `renting = 0`, `available = 8` (đã reserve 2)
- **Chuyển RESERVED → CANCELLED với quantity = 2**
- **Sau**: `stock = 10`, `renting = 0`, `available = 10` ✅

---

## 📊 Ví Dụ Chi Tiết: Tính Available Khi Đặt Đơn Hàng Mới

### Scenario: Outlet có 10 sản phẩm, đã có 2 orders

**Trạng thái ban đầu**:
- `stock = 10`
- `renting = 0`
- `available = 10`

**Order 1**: RENT order, quantity = 3, status = PICKUPED
- `stock = 10` (không đổi)
- `renting = 3` (tăng)
- `available = 7` (giảm)

**Order 2**: RENT order, quantity = 2, status = RESERVED
- `stock = 10` (không đổi)
- `renting = 3` (không đổi)
- `available = 5` (giảm thêm 2)

**Tính available**:
```
available = stock - renting - reserved
available = 10 - 3 - 2 = 5
```

**Đặt Order 3 mới**: RENT order, quantity = 4, status = RESERVED

**Sau khi tạo Order 3**:
- `stock = 10` (không đổi)
- `renting = 3` (không đổi)
- `reserved = 2 + 4 = 6` (Order 2 + Order 3)
- `available = 10 - 3 - 6 = 1` ✅

**Kết quả**: `available = 1` (chỉ còn 1 sản phẩm có sẵn)

---

## 🔍 Tính Available Chi Tiết

### Công Thức Tổng Quát:
```typescript
// Get all RESERVED orders
const reservedOrders = await prisma.order.findMany({
  where: {
    outletId: outlet.id,
    status: ORDER_STATUS.RESERVED,
    orderItems: {
      some: { productId: item.productId }
    }
  },
  include: { orderItems: { where: { productId: item.productId } } }
});

// Calculate total reserved
let totalReserved = 0;
reservedOrders.forEach(order => {
  order.orderItems.forEach(orderItem => {
    if (orderItem.productId === item.productId) {
      totalReserved += orderItem.quantity;
    }
  });
});

// Calculate available
const available = Math.max(0, stock - renting - totalReserved);
```

### Ví Dụ Tính Available:

**Trạng thái**:
- `stock = 10`
- `renting = 3` (Order 1: PICKUPED, quantity = 3)
- `reserved = 6` (Order 2: RESERVED, quantity = 2; Order 3: RESERVED, quantity = 4)

**Tính available**:
```
available = stock - renting - reserved
available = 10 - 3 - 6 = 1
```

**Kết quả**: `available = 1` ✅

---

## 📋 Bảng Tóm Tắt Logic

| Status Transition | stock | renting | available | reserved | Ghi Chú |
|-------------------|-------|---------|-----------|----------|---------|
| **Tạo mới RESERVED** | 0 | 0 | -quantity | +quantity | Reserve tạm thời |
| **RESERVED → PICKUPED** | 0 | +quantity | 0 | -quantity | Pickup, reserved chuyển thành renting |
| **PICKUPED → RETURNED** | 0 | -quantity | +quantity | 0 | Trả lại kho |
| **PICKUPED → CANCELLED** | 0 | -quantity | +quantity | 0 | Hoàn lại |
| **RESERVED → CANCELLED** | 0 | 0 | +quantity | -quantity | Hoàn lại reserve |

### Công Thức Luôn Đúng:
```
available = stock - renting - reserved
```

---

## 🎯 Khi Nào OutletStock Được Update?

### 1. Khi Tạo Order Mới
- **Location**: `apps/api/app/api/orders/route.ts` (POST handler)
- **Trigger**: Sau khi tạo order thành công
- **Condition**: `orderType === RENT && (status === RESERVED || status === PICKUPED)`

### 2. Khi Update Order Status
- **Location**: `packages/database/src/order.ts` (updateOrder function)
- **Trigger**: Khi status thay đổi
- **Condition**: `newStatus !== oldStatus && orderType === RENT`

### 3. Khi Update Stock Thủ Công
- **Location**: `packages/database/src/product.ts` (updateProductStock function)
- **Trigger**: Khi admin update stock thủ công
- **Action**: Sync `available` sau khi update

---

## ✅ Kết Luận

### Mục Tiêu OutletStock:
1. **`stock`**: Số lượng thực tế trong kho (vĩnh viễn, không đổi khi cho thuê)
2. **`renting`**: Số lượng đang cho thuê (tạm thời, tăng khi PICKUPED, giảm khi RETURNED)
3. **`available`**: Số lượng có sẵn = `stock - renting - reserved`

### Logic RENT Orders:
- ✅ **RESERVED**: Giảm `available` (reserve tạm thời)
- ✅ **PICKUPED**: Tăng `renting`, `available` đã giảm trong RESERVED
- ✅ **RETURNED**: Giảm `renting`, tăng `available` (trả lại kho)
- ✅ **CANCELLED**: Hoàn lại dựa trên status trước đó

### Công Thức:
```
available = stock - renting - reserved
```

**Lưu ý**: 
- `stock` không đổi khi cho thuê (vì sẽ trả lại)
- `reserved` = tổng quantity của tất cả RESERVED orders
- Để tính chính xác với date conflicts, dùng Availability API

