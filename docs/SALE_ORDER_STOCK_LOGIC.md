# SALE Order Stock Logic - Review & Verification

## ✅ Yêu cầu

1. **SALE order thành công (COMPLETED/PICKUPED)**: Giảm stock vĩnh viễn
2. **SALE order bị cancel**: Hoàn lại stock (nếu đã giảm trước đó)

## 📋 Logic Hiện Tại

### Location: `packages/database/src/product.ts` - `updateOutletStockForOrder`

```typescript
if (orderType === ORDER_TYPE.SALE) {
  // SALE orders: Permanently decrease stock when COMPLETED/PICKUPED
  if (newStatus === ORDER_STATUS.COMPLETED || newStatus === ORDER_STATUS.PICKUPED) {
    // Only decrease if wasn't already completed/pickuped
    if (oldStatus !== ORDER_STATUS.COMPLETED && oldStatus !== ORDER_STATUS.PICKUPED) {
      stockChange = -item.quantity;        // ✅ Giảm stock vĩnh viễn
      availableChange = -item.quantity;   // ✅ Giảm available
      console.log(`📉 SALE order ${orderId}: Decreasing stock by ${item.quantity} for product ${item.productId}`);
    }
  } else if (newStatus === ORDER_STATUS.CANCELLED) {
    // Rollback stock if was previously completed/pickuped
    if (oldStatus === ORDER_STATUS.COMPLETED || oldStatus === ORDER_STATUS.PICKUPED) {
      stockChange = item.quantity;         // ✅ Hoàn lại stock
      availableChange = item.quantity;     // ✅ Hoàn lại available
      console.log(`📈 SALE order ${orderId}: Rolling back stock by ${item.quantity} for product ${item.productId}`);
    }
  }
  // RESERVED status doesn't change stock (just reserved, not sold yet)
}
```

## ✅ Test Cases

### Case 1: SALE Order Tạo Mới với Status COMPLETED
- **Input**: `oldStatus = null`, `newStatus = COMPLETED`
- **Expected**: Stock giảm `-quantity`
- **Result**: ✅ **Đúng** - `stockChange = -item.quantity`

### Case 2: SALE Order Từ RESERVED → COMPLETED
- **Input**: `oldStatus = RESERVED`, `newStatus = COMPLETED`
- **Expected**: Stock giảm `-quantity`
- **Result**: ✅ **Đúng** - `stockChange = -item.quantity`

### Case 3: SALE Order Từ COMPLETED → CANCELLED
- **Input**: `oldStatus = COMPLETED`, `newStatus = CANCELLED`
- **Expected**: Stock hoàn lại `+quantity`
- **Result**: ✅ **Đúng** - `stockChange = item.quantity`

### Case 4: SALE Order Từ PICKUPED → CANCELLED
- **Input**: `oldStatus = PICKUPED`, `newStatus = CANCELLED`
- **Expected**: Stock hoàn lại `+quantity`
- **Result**: ✅ **Đúng** - `stockChange = item.quantity`

### Case 5: SALE Order Từ RESERVED → CANCELLED
- **Input**: `oldStatus = RESERVED`, `newStatus = CANCELLED`
- **Expected**: Không thay đổi stock (chưa giảm)
- **Result**: ✅ **Đúng** - `stockChange = 0` (không vào điều kiện)

### Case 6: SALE Order Từ COMPLETED → COMPLETED (không đổi)
- **Input**: `oldStatus = COMPLETED`, `newStatus = COMPLETED`
- **Expected**: Không thay đổi stock (đã giảm rồi)
- **Result**: ✅ **Đúng** - `stockChange = 0` (check `oldStatus !== COMPLETED`)

## 🔄 Flow Diagram

```
SALE Order Lifecycle:

1. Tạo mới (RESERVED hoặc COMPLETED)
   ├─ RESERVED → Không giảm stock (chỉ reserve)
   └─ COMPLETED → Giảm stock vĩnh viễn ✅

2. Update Status
   ├─ RESERVED → COMPLETED → Giảm stock ✅
   ├─ COMPLETED → CANCELLED → Hoàn lại stock ✅
   ├─ PICKUPED → CANCELLED → Hoàn lại stock ✅
   └─ RESERVED → CANCELLED → Không đổi (chưa giảm) ✅

3. Không cho phép
   └─ COMPLETED → RESERVED → Không hoàn lại (đã bán rồi)
```

## ✅ Kết Luận

**Logic hiện tại đã ĐÚNG và đáp ứng đầy đủ yêu cầu:**

1. ✅ SALE order thành công (COMPLETED/PICKUPED) → Giảm stock vĩnh viễn
2. ✅ SALE order bị cancel (từ COMPLETED/PICKUPED) → Hoàn lại stock
3. ✅ SALE order RESERVED → Không giảm stock (chưa bán)
4. ✅ SALE order RESERVED → CANCELLED → Không đổi (chưa giảm)
5. ✅ Tránh double-counting (check `oldStatus` trước khi giảm/hoàn)

## 📝 Notes

- **RESERVED status**: SALE orders ở RESERVED không giảm stock (chỉ reserve, chưa bán)
- **COMPLETED/PICKUPED status**: SALE orders ở COMPLETED/PICKUPED đã giảm stock vĩnh viễn
- **CANCELLED từ COMPLETED/PICKUPED**: Hoàn lại stock vì đã giảm trước đó
- **CANCELLED từ RESERVED**: Không hoàn lại vì chưa giảm stock

## 🎯 Implementation Status

✅ **Hoàn thành** - Logic đã đúng và không cần thay đổi.

