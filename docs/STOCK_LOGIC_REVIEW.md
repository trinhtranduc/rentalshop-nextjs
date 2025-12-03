# Stock Management Logic Review

## 📋 Product Model Review

### Current Schema
```prisma
model Product {
  id             Int           @id @default(autoincrement())
  name           String
  description    String?
  barcode        String?       @unique
  totalStock     Int           @default(0)  // ✅ Tổng kho = sum của tất cả OutletStock.stock
  rentPrice      Float
  salePrice      Float?
  deposit        Float         @default(0)
  images         Json?
  isActive       Boolean       @default(true)
  merchantId     Int
  categoryId     Int
  costPrice      Float?
  pricingType    PricingType?
  durationConfig String?
  outletStock    OutletStock[] // ✅ Quan hệ với OutletStock
}

model OutletStock {
  id        Int      @id @default(autoincrement())
  stock     Int      @default(0)      // ✅ Số lượng thực tế trong kho outlet
  available Int      @default(0)      // ✅ Số lượng có sẵn = stock - renting
  renting   Int      @default(0)      // ✅ Số lượng đang cho thuê (tạm thời)
  productId Int
  outletId  Int
}
```

### ✅ Product Model Assessment
**Đã đủ thông tin:**
- ✅ `totalStock`: Tổng kho của merchant (tổng của tất cả outlets)
- ✅ `outletStock`: Chi tiết kho theo từng outlet
- ✅ `rentPrice`, `salePrice`, `deposit`: Thông tin giá
- ✅ `pricingType`, `durationConfig`: Cấu hình pricing
- ✅ `isActive`: Trạng thái sản phẩm

## 🔄 Stock Logic: SALE vs RENT

### 1. SALE Orders (Bán hàng - Giảm kho vĩnh viễn)

**Khi tạo order SALE với status COMPLETED:**
```typescript
// apps/api/app/api/orders/route.ts
const initialStatus = parsed.data.orderType === ORDER_TYPE.SALE 
  ? ORDER_STATUS.COMPLETED 
  : ORDER_STATUS.RESERVED;

// Sau khi tạo order, gọi updateOutletStockForOrder
if (order.orderType === ORDER_TYPE.SALE && order.status === ORDER_STATUS.COMPLETED) {
  await updateOutletStockForOrder(
    order.id,
    null, // oldStatus (null for new orders)
    ORDER_STATUS.COMPLETED,
    'SALE',
    order.outletId,
    orderItems
  );
}
```

**Logic trong `updateOutletStockForOrder`:**
```typescript
if (orderType === ORDER_TYPE.SALE) {
  // SALE orders: Permanently decrease stock when COMPLETED/PICKUPED
  if (newStatus === ORDER_STATUS.COMPLETED || newStatus === ORDER_STATUS.PICKUPED) {
    if (oldStatus !== ORDER_STATUS.COMPLETED && oldStatus !== ORDER_STATUS.PICKUPED) {
      stockChange = -item.quantity;        // ✅ Giảm stock vĩnh viễn
      availableChange = -item.quantity;   // ✅ Giảm available
      // renting không đổi (SALE không dùng renting)
    }
  } else if (newStatus === ORDER_STATUS.CANCELLED) {
    // Rollback stock nếu cancel
    if (oldStatus === ORDER_STATUS.COMPLETED || oldStatus === ORDER_STATUS.PICKUPED) {
      stockChange = item.quantity;         // ✅ Hoàn lại stock
      availableChange = item.quantity;
    }
  }
  // RESERVED status không thay đổi stock (chỉ reserve, chưa bán)
}
```

**Kết quả:**
- ✅ `OutletStock.stock` giảm vĩnh viễn
- ✅ `OutletStock.available` giảm vĩnh viễn
- ✅ `OutletStock.renting` không đổi (vẫn = 0)
- ✅ `Product.totalStock` được sync = sum của tất cả `OutletStock.stock`

### 2. RENT Orders (Cho thuê - Không giảm kho, chỉ tạm thời)

**Khi tạo order RENT với status RESERVED:**
```typescript
const initialStatus = parsed.data.orderType === ORDER_TYPE.RENT 
  ? ORDER_STATUS.RESERVED 
  : ORDER_STATUS.COMPLETED;

// Sau khi tạo order, gọi updateOutletStockForOrder
if (order.orderType === ORDER_TYPE.RENT && 
    (order.status === ORDER_STATUS.RESERVED || order.status === ORDER_STATUS.PICKUPED)) {
  await updateOutletStockForOrder(...);
}
```

**Logic trong `updateOutletStockForOrder`:**
```typescript
else if (orderType === ORDER_TYPE.RENT) {
  // RENT orders: Use renting field (temporary), stock doesn't change
  if (newStatus === ORDER_STATUS.RESERVED) {
    // Reserve: Decrease available (temporary reservation)
    availableChange = -item.quantity;  // ✅ Giảm available tạm thời
    // stock không đổi
    // renting không đổi (chưa pickup)
  } else if (newStatus === ORDER_STATUS.PICKUPED) {
    // Pickup: Increase renting, decrease available
    rentingChange = item.quantity;      // ✅ Tăng renting
    availableChange = -item.quantity;  // ✅ Giảm available
    // stock không đổi
  } else if (newStatus === ORDER_STATUS.RETURNED) {
    // Return: Decrease renting, increase available (trả lại)
    rentingChange = -item.quantity;     // ✅ Giảm renting
    availableChange = item.quantity;     // ✅ Tăng available lại
    // stock không đổi
  } else if (newStatus === ORDER_STATUS.CANCELLED) {
    // Cancel: Rollback based on previous status
    if (oldStatus === ORDER_STATUS.PICKUPED) {
      rentingChange = -item.quantity;   // ✅ Hoàn lại renting
      availableChange = item.quantity;  // ✅ Hoàn lại available
    } else if (oldStatus === ORDER_STATUS.RESERVED) {
      availableChange = item.quantity;  // ✅ Hoàn lại available
    }
    // stock không đổi
  }
}
```

**Kết quả:**
- ✅ `OutletStock.stock` không đổi (vĩnh viễn)
- ✅ `OutletStock.renting` tăng/giảm tạm thời
- ✅ `OutletStock.available` = `stock - renting` (tạm thời)
- ✅ Khi RETURNED: `renting` giảm, `available` tăng lại (trả lại kho)
- ✅ `Product.totalStock` không đổi (vì stock không đổi)

## 📊 Product.totalStock Sync Logic

### Formula
```
Product.totalStock = SUM(OutletStock.stock) for all outlets
```

### Sync Points

**1. Khi tạo Product mới:**
```typescript
// apps/api/app/api/products/route.ts
const product = await db.products.create(finalProductData);
if (outletStock && outletStock.length > 0) {
  await syncProductTotalStock(product.id);
}
```

**2. Khi update Product outletStock:**
```typescript
// apps/api/app/api/products/[id]/route.ts
const updatedProduct = await db.products.update(productId, finalUpdateData);
if (outletStock && outletStock.length > 0) {
  await syncProductTotalStock(productId);
}
```

**3. Khi update OutletStock từ Order (SALE orders):**
```typescript
// packages/database/src/product.ts - updateOutletStockForOrder
if (stockChange !== 0) {  // Chỉ sync khi stock thay đổi (SALE orders)
  await syncProductTotalStock(item.productId);
}
```

**4. Khi update OutletStock thủ công:**
```typescript
// packages/database/src/product.ts - updateProductStock
if (stockChange !== 0) {
  await syncProductTotalStock(productId);
}
```

### Helper Function
```typescript
export async function syncProductTotalStock(productId: number): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true }
  });
  
  const allOutletStock = await prisma.outletStock.findMany({
    where: { productId: product.id },
    select: { stock: true }
  });
  
  const totalStock = allOutletStock.reduce((sum, os) => sum + os.stock, 0);
  
  await prisma.product.update({
    where: { id: product.id },
    data: { totalStock }
  });
}
```

## ✅ Summary

### Product Model
- ✅ **Đủ thông tin**: Có đầy đủ fields cần thiết
- ✅ **totalStock**: Tổng kho = sum của tất cả OutletStock.stock
- ✅ **outletStock**: Chi tiết kho theo từng outlet

### SALE Orders (Bán hàng)
- ✅ **Giảm kho vĩnh viễn**: `stock` và `available` giảm khi COMPLETED/PICKUPED
- ✅ **Không dùng renting**: SALE orders không dùng `renting` field
- ✅ **Sync totalStock**: Tự động sync `Product.totalStock` sau khi giảm stock

### RENT Orders (Cho thuê)
- ✅ **Không giảm kho**: `stock` không đổi (vĩnh viễn)
- ✅ **Dùng renting**: Tăng `renting` khi PICKUPED, giảm khi RETURNED
- ✅ **Trả lại kho**: Khi RETURNED, `renting` giảm, `available` tăng lại
- ✅ **available = stock - renting**: Luôn đúng công thức

### Total Stock Sync
- ✅ **Tự động sync**: `Product.totalStock` = sum của tất cả `OutletStock.stock`
- ✅ **Sync khi**: Tạo product, update outletStock, SALE order giảm stock
- ✅ **Không sync khi**: RENT order (vì stock không đổi)

## 🎯 Kết luận

**Product model đã đủ thông tin và logic stock đã đúng:**
1. ✅ SALE: Giảm kho vĩnh viễn khi bán thành công
2. ✅ RENT: Không giảm kho, chỉ dùng renting tạm thời, trả lại khi RETURNED
3. ✅ TotalStock: Tự động sync = tổng của tất cả outlet stocks
4. ✅ Available: Luôn = stock - renting (đúng công thức)

