# Test Cases cho Product Availability Cache (Date Range)

## Mục đích
Test tính năng check availability cho date range (pickup → return) thay vì chỉ 1 ngày.

---

## Test Case 1: Thêm sản phẩm với date range hợp lệ
**Mục tiêu:** Kiểm tra khi thêm sản phẩm, hệ thống load availability cho tất cả ngày trong range.

**Các bước:**
1. Mở app, chọn "Rent" order
2. Chọn pickup date: 10/12/2025
3. Chọn return date: 15/12/2025 (5 ngày)
4. Thêm sản phẩm vào cart (ví dụ: Product ID = 1, quantity = 2)

**Kết quả mong đợi:**
- Console log hiển thị: "📊 Product Availability Loaded for Date Range"
- Log hiển thị date range: "10/12/2025 to 15/12/2025"
- Hệ thống gọi API 5 lần (mỗi ngày 1 lần) hoặc có thể batch
- Cache được lưu cho 5 ngày (10, 11, 12, 13, 14, 15/12)
- Không có warning về stock

**Kiểm tra:**
- Xem console log để verify API calls
- Verify không có alert "Stock Warning"

---

## Test Case 2: Thay đổi quantity khi đã có cache
**Mục tiêu:** Kiểm tra khi tăng quantity, hệ thống check từ cache (không gọi API).

**Các bước:**
1. Đã có sản phẩm trong cart (từ Test Case 1)
2. Tăng quantity từ 2 lên 5

**Kết quả mong đợi:**
- Console log: "📊 Local Availability Check (Date Range)"
- Không có API call mới (chỉ check từ cache)
- Nếu đủ stock: Không có warning
- Nếu không đủ: Hiển thị alert "Stock Warning" với message: "Not enough stock available. Available: X, Requested: 5"

**Kiểm tra:**
- Verify không có API call mới trong Network tab
- Verify alert hiển thị đúng nếu không đủ stock

---

## Test Case 3: Thay đổi pickup date
**Mục tiêu:** Kiểm tra khi đổi pickup date, cache cũ bị invalidate và load lại cho range mới.

**Các bước:**
1. Đã có sản phẩm trong cart với pickup: 10/12, return: 15/12
2. Đổi pickup date thành: 20/12/2025 (return vẫn là 15/12 - invalid case)
3. Sau đó đổi pickup date thành: 20/12/2025, return: 25/12/2025

**Kết quả mong đợi:**
- Console log: "📊 Product Availability Loaded for Date Range"
- Cache cũ (10-15/12) bị invalidate
- Load availability cho range mới (20-25/12)
- Gọi API cho 6 ngày mới (20, 21, 22, 23, 24, 25/12)

**Kiểm tra:**
- Verify cache cũ không còn
- Verify API calls cho range mới

---

## Test Case 4: Thay đổi return date
**Mục tiêu:** Kiểm tra khi đổi return date, cache được update cho range mới.

**Các bước:**
1. Đã có sản phẩm trong cart với pickup: 10/12, return: 15/12
2. Đổi return date thành: 20/12/2025

**Kết quả mong đợi:**
- Cache cho 10-15/12 vẫn giữ (vì vẫn trong range)
- Load thêm availability cho 16-20/12 (5 ngày mới)
- Gọi API cho 5 ngày mới
- Check availability cho cả range 10-20/12

**Kiểm tra:**
- Verify API chỉ gọi cho ngày mới (16-20/12)
- Verify check availability cho cả range

---

## Test Case 5: Sản phẩm không đủ stock trong range
**Mục tiêu:** Kiểm tra khi có ngày trong range không đủ stock.

**Các bước:**
1. Setup: Sản phẩm có stock = 5
2. Đã có order khác thuê 3 items từ 12/12-14/12
3. Tạo order mới:
   - Pickup: 10/12/2025
   - Return: 15/12/2025
   - Quantity: 3 items

**Kết quả mong đợi:**
- Load availability cho 10-15/12
- Ngày 10, 11, 15: Available = 5 (đủ)
- Ngày 12, 13, 14: Available = 2 (không đủ cho 3 items)
- Minimum available = 2
- Hiển thị alert: "Not enough stock available. Available: 2, Requested: 3"

**Kiểm tra:**
- Verify minimum available = 2
- Verify alert hiển thị đúng

---

## Test Case 6: Multiple products với date range khác nhau
**Mục tiêu:** Kiểm tra khi có nhiều sản phẩm với date range khác nhau.

**Các bước:**
1. Thêm Product A:
   - Pickup: 10/12, Return: 15/12
   - Quantity: 2
2. Thêm Product B:
   - Pickup: 12/12, Return: 18/12
   - Quantity: 3

**Kết quả mong đợi:**
- Product A: Cache cho 10-15/12
- Product B: Cache cho 12-18/12
- Mỗi product check availability độc lập
- Không có conflict giữa các products

**Kiểm tra:**
- Verify cache riêng biệt cho mỗi product
- Verify check availability đúng cho từng product

---

## Test Case 7: Cache expiration (5 minutes)
**Mục tiêu:** Kiểm tra cache tự động expire sau 5 phút.

**Các bước:**
1. Thêm sản phẩm và load availability (cache được tạo)
2. Đợi hơn 5 phút
3. Thay đổi quantity

**Kết quả mong đợi:**
- Cache đã expire
- Khi check availability, phát hiện cache expired
- Tự động reload từ API

**Kiểm tra:**
- Verify API call mới sau khi cache expire
- (Note: Test case này khó test thực tế, có thể mock time)

---

## Test Case 8: Single day rental (pickup = return)
**Mục tiêu:** Kiểm tra edge case khi pickup = return (thuê 1 ngày).

**Các bước:**
1. Chọn pickup date: 10/12/2025
2. Chọn return date: 10/12/2025 (cùng ngày)
3. Thêm sản phẩm

**Kết quả mong đợi:**
- Chỉ check 1 ngày (10/12)
- Gọi API 1 lần
- Cache cho 1 ngày
- Logic vẫn hoạt động đúng

**Kiểm tra:**
- Verify chỉ có 1 API call
- Verify cache chỉ có 1 entry

---

## Test Case 9: Long date range (30+ days)
**Mục tiêu:** Kiểm tra performance với date range dài.

**Các bước:**
1. Chọn pickup: 01/12/2025
2. Chọn return: 31/12/2025 (30 ngày)
3. Thêm sản phẩm

**Kết quả mong đợi:**
- Load availability cho 30 ngày
- Có thể gọi API 30 lần (hoặc batch nếu API support)
- Performance vẫn acceptable
- Cache 30 entries

**Kiểm tra:**
- Verify không bị lag/freeze
- Verify tất cả ngày được cache

---

## Test Case 10: Xóa sản phẩm khỏi cart
**Mục tiêu:** Kiểm tra khi xóa sản phẩm, cache vẫn giữ (có thể dùng lại).

**Các bước:**
1. Thêm sản phẩm với pickup: 10/12, return: 15/12
2. Xóa sản phẩm khỏi cart
3. Thêm lại sản phẩm với cùng date range

**Kết quả mong đợi:**
- Cache vẫn còn (không bị xóa khi remove item)
- Khi thêm lại, sử dụng cache (không gọi API)
- Console log: "📦 Using cached availability"

**Kiểm tra:**
- Verify không có API call khi thêm lại
- Verify sử dụng cache

---

## Checklist khi test:
- [ ] Console logs hiển thị đúng thông tin
- [ ] API calls đúng số lượng và đúng dates
- [ ] Cache được lưu và sử dụng đúng
- [ ] Warnings hiển thị khi không đủ stock
- [ ] Performance acceptable (không lag)
- [ ] Edge cases hoạt động đúng (single day, long range)
- [ ] Cache invalidation hoạt động khi đổi dates

---

## Cách kiểm tra trong code:

### 1. Xem Console Logs:
```
📊 Product Availability Loaded for Date Range:
   Product ID: 1
   Date Range: 10/12/2025 to 15/12/2025
   Minimum Available: 5
   Is Available: true
```

### 2. Xem Network Calls:
- Check trong Network tab hoặc proxy tool
- Verify số lượng API calls = số ngày trong range

### 3. Debug Cache:
Có thể thêm breakpoint trong `ProductAvailabilityCache.swift` để xem cache contents.

