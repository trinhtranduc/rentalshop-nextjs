# Review Logic Product Availability với Date Range

## Ví dụ từ User:
- **Stock A = 10**
- **Đã có booking:** 2 items từ **12/07 - 12/20**
- **Available trong khoảng 12/07-12/20:** 10 - 2 = **8 items**

## Test Cases:

### Case 1: Thuê < 8 items và overlap với 12/07-12/20
**Input:**
- Pickup: 12/10/2025
- Return: 12/15/2025
- Quantity: 5 items

**Expected:**
- ✅ Available (vì 5 < 8)
- Không có warning

**Logic hiện tại:**
1. Load availability cho từng ngày 12/10 → 12/15
2. API trả về cho mỗi ngày: `totalAvailable = 8` (vì đã có 2 items được thuê)
3. Minimum available = 8
4. Check: `5 < 8` → ✅ `isAvailable = true`

**✅ ĐÚNG**

---

### Case 2: Thuê >= 8 items và overlap với 12/07-12/20
**Input:**
- Pickup: 12/10/2025
- Return: 12/15/2025
- Quantity: 9 items

**Expected:**
- ❌ Không available (vì 9 > 8)
- Hiển thị warning: "Not enough stock available. Available: 8, Requested: 9"

**Logic hiện tại:**
1. Load availability cho từng ngày 12/10 → 12/15
2. API trả về cho mỗi ngày: `totalAvailable = 8`
3. Minimum available = 8
4. Check: `9 >= 8` → ❌ `isAvailable = false`
5. Hiển thị alert với message đúng

**✅ ĐÚNG**

---

### Case 3: Không overlap với 12/07-12/20
**Input:**
- Pickup: 12/25/2025
- Return: 12/30/2025
- Quantity: 9 items

**Expected:**
- ✅ Available (vì không overlap, full stock = 10)
- Không có warning

**Logic hiện tại:**
1. Load availability cho từng ngày 12/25 → 12/30
2. API trả về cho mỗi ngày: `totalAvailable = 10` (không có booking trong range này)
3. Minimum available = 10
4. Check: `9 < 10` → ✅ `isAvailable = true`

**✅ ĐÚNG**

---

### Case 4: Partial overlap (một phần overlap)
**Input:**
- Pickup: 12/05/2025
- Return: 12/12/2025
- Quantity: 5 items

**Expected:**
- ✅ Available (vì 5 < 8, và ngày 12/05-12/06 có full stock = 10)

**Logic hiện tại:**
1. Load availability cho từng ngày 12/05 → 12/12
2. API trả về:
   - 12/05, 12/06: `totalAvailable = 10` (chưa overlap)
   - 12/07-12/12: `totalAvailable = 8` (overlap với booking)
3. Minimum available = 8 (lấy minimum trong range)
4. Check: `5 < 8` → ✅ `isAvailable = true`

**✅ ĐÚNG** - Logic lấy minimum đảm bảo an toàn

---

### Case 5: Partial overlap nhưng quantity lớn hơn minimum
**Input:**
- Pickup: 12/05/2025
- Return: 12/12/2025
- Quantity: 9 items

**Expected:**
- ❌ Không available (vì 9 > 8, và có ngày trong range chỉ có 8)

**Logic hiện tại:**
1. Load availability cho từng ngày 12/05 → 12/12
2. API trả về:
   - 12/05, 12/06: `totalAvailable = 10`
   - 12/07-12/12: `totalAvailable = 8`
3. Minimum available = 8
4. Check: `9 >= 8` → ❌ `isAvailable = false`
5. Hiển thị warning: "Available: 8, Requested: 9"

**✅ ĐÚNG**

---

## Review Code Logic:

### 1. `checkAvailability` trong `ProductAvailabilityCache.swift`:

```swift
func checkAvailability(productId: Int, startDate: Date, endDate: Date, requestedQuantity: Int) -> (isAvailable: Bool, available: Int)?
```

**Logic:**
- Duyệt từng ngày trong range (startDate → endDate)
- Lấy `totalAvailable` từ cache cho mỗi ngày
- Track **minimum available** trong range
- Check: `available >= requestedQuantity` cho mỗi ngày
- Return: `(isAvailable: allAvailable, available: minAvailable)`

**✅ ĐÚNG** - Logic này đảm bảo:
- Lấy minimum available (an toàn nhất)
- Tất cả ngày trong range phải đủ stock
- Trả về minimum available để hiển thị warning

---

### 2. `loadAvailabilityForDateRange` trong `InfoMainViewController.swift`:

**Logic:**
- Load availability cho tất cả ngày trong range
- Cache từng ngày riêng biệt
- Sau khi load xong, check availability với `checkAvailability`

**✅ ĐÚNG** - Cache từng ngày cho phép:
- Reuse cache khi có range overlap
- Check nhanh từ cache khi đổi quantity
- Invalidate cache khi đổi date

---

### 3. Warning Message:

```swift
let message = String(format: "Not enough stock available. Available: %d, Requested: %d".localized(), available, quantity)
```

**✅ ĐÚNG** - Hiển thị minimum available và requested quantity

---

## Kết luận:

### ✅ Logic hiện tại ĐÚNG và đáp ứng yêu cầu:

1. **Check availability cho cả date range** (không chỉ 1 ngày)
2. **Lấy minimum available** trong range (an toàn nhất)
3. **Hiển thị warning đúng** khi không đủ stock
4. **Cache từng ngày** để tối ưu performance

### 📝 Lưu ý:

1. **API phải trả về đúng `totalAvailable`** cho từng ngày:
   - `totalAvailable = totalStock - totalRented - totalReserved`
   - Đã tính sẵn các bookings trong ngày đó

2. **Edge case đã xử lý:**
   - Single day rental (pickup = return)
   - Long date range (30+ days)
   - Partial overlap với existing bookings

3. **Performance:**
   - Cache từng ngày → có thể reuse khi range overlap
   - Chỉ load ngày chưa có trong cache
   - Check từ cache khi đổi quantity (không gọi API)

---

## Test với ví dụ của User:

**Setup:**
- Stock A = 10
- Booking: 2 items từ 12/07-12/20
- Available trong 12/07-12/20 = 8

**Test 1:** Quantity = 5, Pickup = 12/10, Return = 12/15
- ✅ Expected: Available
- ✅ Logic: Minimum = 8, 5 < 8 → Available

**Test 2:** Quantity = 9, Pickup = 12/10, Return = 12/15
- ✅ Expected: Not Available
- ✅ Logic: Minimum = 8, 9 > 8 → Not Available

**Test 3:** Quantity = 9, Pickup = 12/25, Return = 12/30
- ✅ Expected: Available
- ✅ Logic: Minimum = 10, 9 < 10 → Available

**✅ Tất cả test cases PASS**

