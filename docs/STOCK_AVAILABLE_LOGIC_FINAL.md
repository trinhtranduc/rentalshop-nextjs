# Stock & Available Logic - Final Correct Version

## ✅ Công Thức Đúng

### OutletStock Available Calculation
```
available = stock - renting
```

**KHÔNG tính reserved** vì:
- Reserved items vẫn còn trong kho (chỉ reserve tạm thời)
- Reserved chỉ được check trong Availability API khi có ngày (date-based conflicts)

### Product Total Stock
```
Product.totalStock = SUM(OutletStock.stock) for all outlets
```

**Đảm bảo**: Stock của product luôn bằng tổng stock của tất cả outlets

---

## 📋 RENT Orders Logic

### 1. RESERVED Status
- **stock**: Không đổi (vẫn trong kho)
- **renting**: Không đổi (= 0)
- **available**: Không đổi (items vẫn trong kho, chỉ reserve tạm thời)

**Ví Dụ**:
```
Trước: stock = 10, renting = 0, available = 10
Tạo RENT order RESERVED với quantity = 2
Sau:  stock = 10, renting = 0, available = 10 ✅ (không đổi)
```

### 2. RESERVED → PICKUPED
- **stock**: Không đổi
- **renting**: Tăng `+quantity`
- **available**: Giảm `-quantity` (items đã được pickup)

**Ví Dụ**:
```
Trước: stock = 10, renting = 0, available = 10
Chuyển RESERVED → PICKUPED với quantity = 2
Sau:  stock = 10, renting = 2, available = 8 ✅
```

### 3. PICKUPED → RETURNED
- **stock**: Không đổi
- **renting**: Giảm `-quantity`
- **available**: Tăng `+quantity` (trả lại kho)

**Ví Dụ**:
```
Trước: stock = 10, renting = 2, available = 8
Chuyển PICKUPED → RETURNED với quantity = 2
Sau:  stock = 10, renting = 0, available = 10 ✅
```

### 4. PICKUPED → CANCELLED
- **stock**: Không đổi
- **renting**: Giảm `-quantity`
- **available**: Tăng `+quantity` (hoàn lại)

**Ví Dụ**:
```
Trước: stock = 10, renting = 2, available = 8
Chuyển PICKUPED → CANCELLED với quantity = 2
Sau:  stock = 10, renting = 0, available = 10 ✅
```

### 5. RESERVED → CANCELLED
- **stock**: Không đổi
- **renting**: Không đổi
- **available**: Không đổi (items vẫn trong kho)

**Ví Dụ**:
```
Trước: stock = 10, renting = 0, available = 10
Chuyển RESERVED → CANCELLED với quantity = 2
Sau:  stock = 10, renting = 0, available = 10 ✅ (không đổi)
```

---

## 📊 SALE Orders Logic

### 1. COMPLETED/PICKUPED Status
- **stock**: Giảm `-quantity` (vĩnh viễn)
- **renting**: Không đổi (= 0)
- **available**: Giảm `-quantity` (vĩnh viễn)

**Ví Dụ**:
```
Trước: stock = 10, renting = 0, available = 10
Tạo SALE order COMPLETED với quantity = 2
Sau:  stock = 8, renting = 0, available = 8 ✅
```

### 2. COMPLETED → CANCELLED
- **stock**: Tăng `+quantity` (hoàn lại)
- **renting**: Không đổi
- **available**: Tăng `+quantity` (hoàn lại)

**Ví Dụ**:
```
Trước: stock = 8, renting = 0, available = 8
Chuyển COMPLETED → CANCELLED với quantity = 2
Sau:  stock = 10, renting = 0, available = 10 ✅
```

---

## 🔄 Product.totalStock Sync

### Công Thức
```
Product.totalStock = SUM(OutletStock.stock) for all outlets
```

### Sync Points
1. **Khi tạo Product mới với outletStock**
2. **Khi update Product outletStock**
3. **Khi SALE order giảm stock** (chỉ khi stock thay đổi)
4. **Khi update OutletStock thủ công**

### Logic
```typescript
// Get all outlet stock for this product
const allOutletStock = await prisma.outletStock.findMany({
  where: { productId: product.id },
  select: { stock: true }
});

// Calculate total stock = sum of all outlet stocks
const totalStock = allOutletStock.reduce((sum, os) => sum + os.stock, 0);

// Update Product.totalStock
await prisma.product.update({
  where: { id: product.id },
  data: { totalStock }
});
```

---

## 📋 Bảng Tóm Tắt

### RENT Orders
| Status Change | stock | renting | available | Công Thức |
|---------------|-------|---------|-----------|-----------|
| **Tạo RESERVED** | 0 | 0 | 0 | `available = stock - renting = 10 - 0 = 10` |
| **RESERVED → PICKUPED** | 0 | +quantity | -quantity | `available = stock - renting = 10 - 2 = 8` |
| **PICKUPED → RETURNED** | 0 | -quantity | +quantity | `available = stock - renting = 10 - 0 = 10` |
| **PICKUPED → CANCELLED** | 0 | -quantity | +quantity | `available = stock - renting = 10 - 0 = 10` |
| **RESERVED → CANCELLED** | 0 | 0 | 0 | `available = stock - renting = 10 - 0 = 10` |

### SALE Orders
| Status Change | stock | renting | available | Công Thức |
|---------------|-------|---------|-----------|-----------|
| **Tạo COMPLETED** | -quantity | 0 | -quantity | `available = stock - renting = 8 - 0 = 8` |
| **COMPLETED → CANCELLED** | +quantity | 0 | +quantity | `available = stock - renting = 10 - 0 = 10` |

---

## ✅ Kết Luận

### Công Thức Chính:
```
available = stock - renting
Product.totalStock = SUM(OutletStock.stock) for all outlets
```

### Logic RENT Orders:
- ✅ **RESERVED**: Không thay đổi stock/renting/available (items vẫn trong kho)
- ✅ **PICKUPED**: Tăng renting, giảm available
- ✅ **RETURNED**: Giảm renting, tăng available
- ✅ **CANCELLED**: Hoàn lại dựa trên status trước đó

### Logic SALE Orders:
- ✅ **COMPLETED**: Giảm stock và available vĩnh viễn
- ✅ **CANCELLED**: Hoàn lại stock và available

### Reserved Check:
- ✅ Reserved **KHÔNG** được tính vào available
- ✅ Reserved chỉ được check trong Availability API với date-based conflicts

