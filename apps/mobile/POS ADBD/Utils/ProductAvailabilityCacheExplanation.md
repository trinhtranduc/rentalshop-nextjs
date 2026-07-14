# Giải thích ProductAvailabilityCache

## 📋 Tổng quan

`ProductAvailabilityCache` là một **singleton cache manager** được thiết kế để lưu trữ và quản lý thông tin availability (tồn kho khả dụng) của sản phẩm theo từng ngày. Mục đích chính là **tối ưu performance** bằng cách tránh gọi API nhiều lần cho cùng một sản phẩm và ngày.

---

## 🎯 Tại sao cần ProductAvailabilityCache?

### Vấn đề không có cache:
1. **Gọi API quá nhiều**: Mỗi lần user thay đổi quantity hoặc date, phải gọi API lại
2. **Performance kém**: Delay khi check availability, UI bị lag
3. **Tốn bandwidth**: Gọi API không cần thiết cho cùng một data

### Giải pháp với cache:
1. **Gọi API 1 lần** khi thêm sản phẩm → cache lại
2. **Check từ cache** khi đổi quantity/date → không cần gọi API
3. **Performance tốt**: Check ngay lập tức từ memory

---

## 🏗️ Cấu trúc

### 1. **AvailabilityCacheKey** (Struct)
```swift
struct AvailabilityCacheKey: Hashable {
    let productId: Int
    let date: Date // Normalized to start of day
}
```

**Mục đích**: Làm key để lưu cache, kết hợp `productId` + `date`

**Đặc điểm**:
- `Hashable`: Có thể dùng làm key trong Dictionary
- `date` được normalize về `startOfDay()` để đảm bảo consistency (ví dụ: 10/12/2025 14:30 → 10/12/2025 00:00)

**Ví dụ**:
- Key 1: `productId: 1, date: 10/12/2025 00:00`
- Key 2: `productId: 1, date: 11/12/2025 00:00`
- Key 3: `productId: 2, date: 10/12/2025 00:00`

---

### 2. **CachedAvailability** (Struct)
```swift
struct CachedAvailability {
    let summary: ProductAvailabilitySummary
    let cachedAt: Date
    
    var isExpired: Bool {
        let expirationTime: TimeInterval = 5 * 60 // 5 minutes
        return Date().timeIntervalSince(cachedAt) > expirationTime
    }
}
```

**Mục đích**: Lưu trữ data availability và thời gian cache

**Thành phần**:
- `summary`: Thông tin availability từ API (totalStock, totalAvailable, etc.)
- `cachedAt`: Thời điểm cache được tạo
- `isExpired`: Check xem cache đã hết hạn chưa (5 phút)

**Lý do expire 5 phút**:
- Data availability có thể thay đổi khi có order mới
- 5 phút là balance giữa accuracy và performance

---

### 3. **ProductAvailabilityCache** (Class - Singleton)
```swift
class ProductAvailabilityCache {
    static let shared = ProductAvailabilityCache()
    
    private var cache: [AvailabilityCacheKey: CachedAvailability] = [:]
    private let cacheQueue = DispatchQueue(label: "com.rentalshop.availabilityCache", attributes: .concurrent)
}
```

**Đặc điểm**:
- **Singleton**: Chỉ có 1 instance duy nhất trong app (`shared`)
- **Thread-safe**: Sử dụng `DispatchQueue` với `.concurrent` + `.barrier` để đảm bảo thread safety
- **In-memory cache**: Lưu trong memory (không persist)

---

## 🔧 Các Method chính

### 1. **getAvailability(productId:date:)**
```swift
func getAvailability(productId: Int, date: Date) -> ProductAvailabilitySummary?
```

**Mục đích**: Lấy availability từ cache cho 1 ngày cụ thể

**Logic**:
1. Tạo key từ `productId` + `date` (normalized)
2. Tìm trong cache
3. Check xem cache có expired không
4. Return `summary` nếu có và chưa expired, `nil` nếu không

**Ví dụ**:
```swift
// Lấy availability cho product 1, ngày 10/12/2025
if let summary = ProductAvailabilityCache.shared.getAvailability(productId: 1, date: date) {
    let available = summary.totalAvailable ?? 0
    print("Available: \(available)")
} else {
    print("Not in cache, need to load from API")
}
```

---

### 2. **setAvailability(productId:date:summary:)**
```swift
func setAvailability(productId: Int, date: Date, summary: ProductAvailabilitySummary)
```

**Mục đích**: Lưu availability vào cache

**Logic**:
1. Tạo key từ `productId` + `date`
2. Tạo `CachedAvailability` với `summary` và `cachedAt = Date()`
3. Lưu vào cache (thread-safe với barrier)

**Ví dụ**:
```swift
// Sau khi load từ API, lưu vào cache
OrderService.shared.loadProductAvailability(productId: 1, date: date) { response, error in
    if let summary = response?.data?.summary {
        ProductAvailabilityCache.shared.setAvailability(
            productId: 1,
            date: date,
            summary: summary
        )
    }
}
```

---

### 3. **checkAvailability(productId:startDate:endDate:requestedQuantity:)** ⭐
```swift
func checkAvailability(
    productId: Int, 
    startDate: Date, 
    endDate: Date, 
    requestedQuantity: Int
) -> (isAvailable: Bool, available: Int)?
```

**Mục đích**: Check availability cho **date range** (pickup → return)

**Logic**:
1. Duyệt từng ngày trong range (startDate → endDate)
2. Lấy availability từ cache cho mỗi ngày
3. Nếu bất kỳ ngày nào không có trong cache → return `nil` (cần load)
4. Track **minimum available** trong range
5. Check xem tất cả ngày có đủ stock không (`available >= requestedQuantity`)
6. Return `(isAvailable: allAvailable, available: minAvailable)`

**Ví dụ**:
```swift
// Check availability cho product 1, từ 10/12 đến 15/12, cần 5 items
if let result = ProductAvailabilityCache.shared.checkAvailability(
    productId: 1,
    startDate: pickupDate,
    endDate: returnDate,
    requestedQuantity: 5
) {
    let (isAvailable, minAvailable) = result
    if isAvailable {
        print("✅ Đủ stock: \(minAvailable) items")
    } else {
        print("❌ Không đủ stock: chỉ có \(minAvailable) items")
    }
} else {
    print("⚠️ Chưa có cache, cần load từ API")
}
```

**Tại sao lấy minimum?**
- Đảm bảo an toàn: Nếu có ngày nào thiếu stock, sẽ báo ngay
- Ví dụ: Range 10-15/12, ngày 12/12 chỉ còn 3 items → minimum = 3

---

### 4. **checkAvailability(productId:date:requestedQuantity:)** (Single date)
```swift
func checkAvailability(productId: Int, date: Date, requestedQuantity: Int) -> (isAvailable: Bool, available: Int)?
```

**Mục đích**: Check availability cho **1 ngày** (backward compatibility)

**Logic**: Tương tự như date range nhưng chỉ check 1 ngày

---

### 5. **invalidate(productId:date:)**
```swift
func invalidate(productId: Int, date: Date)
```

**Mục đích**: Xóa cache cho 1 ngày cụ thể

**Khi nào dùng**: Khi biết data đã thay đổi (ví dụ: có order mới)

---

### 6. **invalidateProduct(productId:)**
```swift
func invalidateProduct(productId: Int)
```

**Mục đích**: Xóa tất cả cache của 1 sản phẩm (tất cả ngày)

**Khi nào dùng**: Khi đổi date range, cần load lại cho range mới

**Ví dụ**:
```swift
// Khi user đổi pickup/return date
ProductAvailabilityCache.shared.invalidateProduct(productId: 1)
// Sau đó load lại cho date range mới
loadAvailabilityForDateRange(productId: 1, startDate: newPickup, endDate: newReturn)
```

---

### 7. **clearAll()**
```swift
func clearAll()
```

**Mục đích**: Xóa toàn bộ cache

**Khi nào dùng**: Khi reset cart, logout, hoặc cần refresh toàn bộ data

---

### 8. **cleanExpired()**
```swift
func cleanExpired()
```

**Mục đích**: Xóa các cache đã expired (> 5 phút)

**Khi nào dùng**: Có thể gọi định kỳ để cleanup memory

---

## 🔒 Thread Safety

### Vấn đề:
- Cache được truy cập từ nhiều thread (main thread, background thread)
- Cần đảm bảo không có race condition

### Giải pháp:
```swift
private let cacheQueue = DispatchQueue(label: "com.rentalshop.availabilityCache", attributes: .concurrent)
```

**Cách hoạt động**:
- **Read operations** (`getAvailability`): Dùng `sync` → nhiều thread có thể đọc đồng thời
- **Write operations** (`setAvailability`, `invalidate`): Dùng `async(flags: .barrier)` → chỉ 1 thread write tại 1 thời điểm, block tất cả read/write khác

**Ví dụ**:
```swift
// Read (concurrent - nhiều thread có thể đọc cùng lúc)
return cacheQueue.sync {
    guard let cached = cache[key], !cached.isExpired else { return nil }
    return cached.summary
}

// Write (barrier - chỉ 1 thread write, block tất cả)
cacheQueue.async(flags: .barrier) {
    self.cache[key] = cached
}
```

---

## 📊 Flow hoạt động

### Scenario 1: Thêm sản phẩm mới
```
1. User thêm Product A (pickup: 10/12, return: 15/12)
2. loadAndCacheProductAvailability() được gọi
3. Check cache → không có → gọi API
4. Load availability cho 6 ngày (10, 11, 12, 13, 14, 15/12)
5. Cache từng ngày: cache[productId:1, date:10/12] = summary1
                      cache[productId:1, date:11/12] = summary2
                      ...
6. Reload table → cell hiển thị status
```

### Scenario 2: Đổi quantity
```
1. User tăng quantity từ 2 → 5
2. checkProductAvailabilityLocally() được gọi
3. checkAvailability(productId:1, startDate:10/12, endDate:15/12, quantity:5)
4. Check từ cache (không gọi API):
   - 10/12: available = 8 ✅
   - 11/12: available = 8 ✅
   - 12/12: available = 8 ✅
   - ...
   - Minimum = 8
   - 5 < 8 → isAvailable = true
5. Reload table → cell vẫn hiển thị "Available"
```

### Scenario 3: Đổi date
```
1. User đổi pickup từ 10/12 → 20/12
2. invalidateProduct(productId:1) → xóa cache cũ
3. loadAvailabilityForDateRange() → load cho range mới (20-25/12)
4. Cache mới: cache[productId:1, date:20/12] = summary1
               cache[productId:1, date:21/12] = summary2
               ...
5. Reload table → cell update status
```

---

## 💡 Best Practices

### 1. **Load cache khi thêm sản phẩm**
```swift
// ✅ Đúng: Load và cache khi thêm
addProduct() {
    // ... add to cart
    loadAndCacheProductAvailability(for: productId)
}

// ❌ Sai: Không load cache
addProduct() {
    // ... add to cart
    // Không load → khi check sẽ return nil
}
```

### 2. **Check từ cache khi đổi quantity/date**
```swift
// ✅ Đúng: Check từ cache (nhanh)
didChangeQuantity() {
    checkProductAvailabilityLocally(for: productId, quantity: newQuantity)
    // Không gọi API
}

// ❌ Sai: Gọi API mỗi lần đổi
didChangeQuantity() {
    loadProductAvailability() // Gọi API → chậm
}
```

### 3. **Invalidate khi đổi date range**
```swift
// ✅ Đúng: Invalidate cache cũ trước khi load mới
didChangeDate() {
    invalidateProduct(productId: productId)
    loadAvailabilityForDateRange(...)
}

// ❌ Sai: Không invalidate → dùng cache cũ (sai data)
didChangeDate() {
    loadAvailabilityForDateRange(...) // Dùng cache cũ
}
```

---

## 🎯 Tóm tắt

**ProductAvailabilityCache** là một cache manager giúp:
1. ✅ **Tối ưu performance**: Tránh gọi API nhiều lần
2. ✅ **Thread-safe**: An toàn khi truy cập từ nhiều thread
3. ✅ **Auto-expire**: Cache tự động hết hạn sau 5 phút
4. ✅ **Date range support**: Check availability cho cả range (pickup → return)
5. ✅ **Memory efficient**: Lưu trong memory, có thể cleanup

**Khi nào dùng**:
- ✅ Khi cần check availability nhanh (không gọi API)
- ✅ Khi đã load availability từ API và muốn reuse
- ✅ Khi cần check cho date range (nhiều ngày)

**Khi nào không dùng**:
- ❌ Khi cần data real-time 100% (cache có thể expired)
- ❌ Khi cần persist data (cache chỉ trong memory)

