# Hướng dẫn hệ thống Rental Duration - Chi tiết

## 1. So sánh chi tiết với hệ thống hiện đại

### Odoo Rental Module

**Product-level Configuration:**
- Mỗi sản phẩm có thể có cấu hình riêng:
  - **Pricing type**: Hourly, Daily, Weekly, Monthly
  - **Min/Max duration**: Ví dụ min 2 hours, max 168 hours (1 week)
  - **Default duration**: 4 hours
  - **Pricing tiers**: Giá khác nhau cho các khoảng thời gian
    - 1-3 hours: $50/hour
    - 4-8 hours: $45/hour
    - 9+ hours: $40/hour

**Quy trình Odoo:**
1. Merchant tạo sản phẩm → Chọn pricing type → Set min/max duration
2. Customer chọn sản phẩm → Chọn thời gian → Hệ thống validate duration
3. Hệ thống tính giá dựa trên duration và pricing tiers

### Rentman

**Flexible Duration Units:**
- Hỗ trợ: Hour, Day, Week, Month
- Product có thể override merchant defaults
- Duration limits được validate khi booking

**Quy trình Rentman:**
1. Product configuration: Set duration unit và limits
2. Booking: Customer chọn duration → System validate
3. Pricing: Tính theo unit đã chọn

### Booqable

**Clear UI với Duration Unit Labels:**
- UI hiển thị rõ: "Rent for 4 hours" hoặc "Rent for 3 days"
- Min/Max duration hiển thị với unit: "Minimum: 2 hours, Maximum: 24 hours"
- Validation errors rõ ràng: "Duration must be at least 2 hours"

## 2. Thiết kế hệ thống (Tính theo lần - By Time)

### Architecture Design (Theo Odoo/Rentman/Booqable)

**Core Concept: "Product-based Pricing"**
- **Product là source of truth duy nhất** - mỗi sản phẩm phải có cấu hình riêng
- **Không có fallback về merchant** - mỗi product độc lập hoàn toàn
- Tính theo thời gian (HOURLY, DAILY) hoặc FIXED (per rental/per time)

**Hierarchy:**
```
Product (Required Config) ← Source of Truth (Bắt buộc)
  └─> Order (Actual Duration) ← Lưu kết quả thực tế
```

**Quan trọng:**
- Mỗi product có pricingType **optional** (nullable) - default FIXED nếu null
- durationConfig **required** chỉ cho HOURLY/DAILY, không cần cho FIXED
- Không có fallback về merchant config
- Mỗi product hoàn toàn độc lập

### Database Schema Design

**Product Level (Optional - Source of Truth):**
```typescript
Product {
  rentPrice: number
  pricingType: 'HOURLY' | 'DAILY' | 'FIXED' | null  // OPTIONAL: nullable, default FIXED nếu null
  durationConfig: {  // REQUIRED cho HOURLY/DAILY, không cần cho FIXED
    minDuration: number,    // 1 hour hoặc 1 day
    maxDuration: number,    // 168 hours hoặc 30 days
    defaultDuration: number // 4 hours hoặc 3 days
  } | null
  // Optional: có thể thêm pricing tiers trong tương lai
  pricingTiers?: [
    { minDuration: 1, maxDuration: 3, price: 50000 },
    { minDuration: 4, maxDuration: 8, price: 45000 }
  ]
}
```

**Lưu ý quan trọng:**
- `pricingType` là **OPTIONAL** (nullable) - default FIXED nếu null (backward compatible)
- `durationConfig` là **REQUIRED** cho HOURLY/DAILY, **KHÔNG CẦN** cho FIXED
- Không có fallback về merchant - mỗi product có config riêng hoặc default FIXED
- Existing products không có pricingType sẽ tự động dùng FIXED

**Pricing Types Explained:**
- **FIXED (Per Rental/Per Time)**: Giá cố định cho mỗi lần thuê, **không tính theo thời gian**
  - Ví dụ: Áo dài 500,000 VND/lần, không care thuê 1 ngày hay 3 ngày
  - Không cần duration limits
  - Total Price = rentPrice × quantity (không nhân duration)
  
- **HOURLY**: Tính theo giờ
  - Ví dụ: Xe máy 50,000 VND/giờ
  - Cần duration limits (min/max hours)
  - Total Price = rentPrice × duration (hours) × quantity
  
- **DAILY**: Tính theo ngày
  - Ví dụ: Máy khoan 200,000 VND/ngày
  - Cần duration limits (min/max days)
  - Total Price = rentPrice × duration (days) × quantity

**Merchant Level (Chỉ để suggest khi tạo product - Không dùng trong logic):**
```typescript
Merchant {
  pricingType: 'HOURLY' | 'DAILY' | 'FIXED'  // Chỉ để suggest khi tạo product mới
  pricingConfig: {
    durationLimits: {
      minDuration: number,    // Chỉ để suggest khi tạo product mới
      maxDuration: number,    // Chỉ để suggest khi tạo product mới
      defaultDuration: number // Chỉ để suggest khi tạo product mới
    }
  }
}
```

**Lưu ý:**
- Merchant config **chỉ để suggest** khi tạo product mới (UI convenience)
- **KHÔNG dùng** trong logic tính toán hoặc validation
- Sau khi product được tạo, merchant config không ảnh hưởng gì

**Order Level (Actual):**
```typescript
Order {
  rentalDuration: number        // Số lượng (hours hoặc days)
  rentalDurationUnit: 'hour' | 'day'  // Unit để biết tính theo gì
  pickupPlanAt: DateTime
  returnPlanAt: DateTime
}
```

### Calculation Logic

**Duration Calculation:**
```typescript
// HOURLY: Tính bằng giờ
if (pricingType === 'HOURLY') {
  duration = Math.ceil((end - start) / (1000 * 60 * 60)); // hours
  unit = 'hour';
}

// DAILY: Tính bằng ngày
if (pricingType === 'DAILY') {
  duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // days
  unit = 'day';
}

// FIXED (Per Rental/Per Time): Không tính duration, chỉ tính theo lần
if (pricingType === 'FIXED') {
  duration = 1; // 1 rental (không care thời gian)
  unit = 'rental';
  // Không cần validate duration limits cho FIXED
}
```

**Price Calculation:**
```typescript
// FIXED (Per Rental/Per Time): price = rentPrice (không nhân duration)
// Không care thời gian thuê, chỉ tính theo lần
totalPrice = product.rentPrice * quantity;
// Ví dụ: Áo dài 500,000 VND/lần, thuê 1 ngày hay 3 ngày đều 500,000 VND

// HOURLY: price = rentPrice * effectiveDuration (hours)
// Minimum Charge: Nếu duration < minDuration, tính theo minDuration
effectiveDuration = Math.max(duration, minDuration);
totalPrice = product.rentPrice * effectiveDuration * quantity;
// Ví dụ: Xe máy 50,000 VND/giờ, minDuration = 2 hours
//   - Thuê 8 giờ = 50,000 × 8 = 400,000 VND
//   - Thuê 1 giờ = 50,000 × 2 = 100,000 VND (minimum charge)

// DAILY: price = rentPrice * effectiveDuration (days)
// Minimum Charge: Nếu duration < minDuration, tính theo minDuration
effectiveDuration = Math.max(duration, minDuration);
totalPrice = product.rentPrice * effectiveDuration * quantity;
// Ví dụ: Máy khoan 200,000 VND/ngày, minDuration = 1 day
//   - Thuê 3 ngày = 200,000 × 3 = 600,000 VND
//   - Thuê 0.5 ngày = 200,000 × 1 = 200,000 VND (minimum charge)
```

**Minimum Charge Logic:**
- Nếu duration < minDuration → Hệ thống tự động tính theo minDuration (minimum charge)
- Hiển thị warning (không phải error) để thông báo cho customer
- Customer vẫn có thể tạo order, nhưng sẽ bị charge theo minimum
- Ví dụ: Product có minDuration = 2 hours, customer thuê 1 hour → Charge 2 hours

## 3. Hướng dẫn quy trình sử dụng

### Bước 1: Cấu hình Merchant (Settings) - Chỉ để Suggest

**Location:** Settings → Pricing Configuration

**Lưu ý:** Merchant config **chỉ để suggest** khi tạo product mới (UI convenience). Sau khi product được tạo, merchant config **không ảnh hưởng gì**. Mỗi product hoàn toàn độc lập.

**Các bước:**
1. Chọn Business Type:
   - **VEHICLE** → Default: HOURLY (min 1h, max 168h, default 4h)
   - **EQUIPMENT** → Default: DAILY (min 1d, max 30d, default 3d)
   - **CLOTHING** → Default: FIXED (không cần duration)
   - **GENERAL** → Default: FIXED

2. Chọn Default Pricing Type (sẽ suggest khi tạo product mới):
   - **HOURLY**: Tính theo giờ
   - **DAILY**: Tính theo ngày
   - **FIXED**: Giá cố định (không tính theo thời gian)

3. Cấu hình Default Duration Limits (sẽ suggest khi tạo product mới):
   - **Minimum Duration**: Thời gian thuê tối thiểu mặc định
   - **Maximum Duration**: Thời gian thuê tối đa mặc định
   - **Default Duration**: Thời gian mặc định khi tạo order

**Ví dụ cấu hình:**
```
Business Type: VEHICLE
Default Pricing Type: HOURLY (suggest khi tạo product mới)
Default Duration Limits:
  - Minimum: 1 hour (suggest)
  - Maximum: 168 hours (suggest)
  - Default: 4 hours (suggest)
```

**Quan trọng:** 
- Merchant config **chỉ để suggest** khi tạo product mới (UI convenience)
- Khi tạo product, bạn **phải** chọn pricing type và duration limits cho product
- Sau khi product được tạo, merchant config **không ảnh hưởng gì**
- Mỗi product hoàn toàn độc lập, không có fallback về merchant

### Bước 2: Tạo và cấu hình sản phẩm

**Location:** Products → Create Product

**Các bước:**
1. Nhập thông tin cơ bản:
   - Tên sản phẩm: "Xe máy Honda Wave"
   - Mô tả: "Xe máy cho thuê theo giờ"
   - Hình ảnh: Upload ảnh sản phẩm

2. **Cấu hình Pricing Type (OPTIONAL - Default FIXED):**
   - **FIXED (Per Rental/Per Time)**: Giá cố định cho mỗi lần thuê, **không tính theo thời gian**
     - Ví dụ: Áo dài 500,000 VND/lần, không care thuê 1 ngày hay 3 ngày
     - Không cần duration limits
     - **Default**: Nếu không chọn, hệ thống tự động dùng FIXED
   - **HOURLY**: Tính theo giờ (ví dụ: xe máy, xe đạp)
     - **REQUIRED** phải có duration limits (min/max hours) nếu chọn HOURLY
   - **DAILY**: Tính theo ngày (ví dụ: máy khoan, thiết bị)
     - **REQUIRED** phải có duration limits (min/max days) nếu chọn DAILY
   - Hệ thống sẽ suggest từ merchant config (nếu có), nhưng bạn có thể chọn hoặc để default FIXED

3. **Cấu hình Duration Limits (REQUIRED cho HOURLY/DAILY, không cần cho FIXED):**
   - **Minimum Duration**: Thời gian thuê tối thiểu (ví dụ: 1 hour hoặc 1 day)
   - **Maximum Duration**: Thời gian thuê tối đa (ví dụ: 168 hours hoặc 30 days)
   - **Default Duration**: Thời gian mặc định khi tạo order (ví dụ: 4 hours hoặc 3 days)
   - Hệ thống sẽ suggest từ merchant config (nếu có), nhưng bạn **phải** nhập cho product nếu chọn HOURLY/DAILY
   - **Lưu ý**: FIXED pricing không cần duration limits vì không tính theo thời gian
   - **Quan trọng**: Nếu chọn HOURLY/DAILY, product phải có duration limits riêng, không dùng merchant config

4. Cấu hình giá:
   - **Rent Price**: 50,000 VND (giá cho 1 giờ hoặc 1 ngày tùy pricing type)
   - **Sale Price**: (nếu có bán)
   - **Deposit**: 500,000 VND (tiền cọc)

**Ví dụ:**
```
Product: "Xe máy Honda Wave"
Pricing Type: HOURLY (cấu hình riêng cho sản phẩm này)
Rent Price: 50,000 VND/hour
Duration Limits:
  - Minimum: 2 hours (sản phẩm này yêu cầu tối thiểu 2h)
  - Maximum: 48 hours (sản phẩm này chỉ cho thuê tối đa 48h)
  - Default: 4 hours
Deposit: 500,000 VND
```

**Lưu ý:**
- Mỗi sản phẩm có thể có pricing type và duration limits khác nhau
- Không cần phải giống merchant config
- Có thể có sản phẩm HOURLY và sản phẩm DAILY trong cùng merchant

### Bước 3: Tạo đơn hàng (Order)

**Location:** Orders → Create Order

**Các bước:**
1. Chọn Customer:
   - Tìm hoặc tạo customer mới

2. Chọn Outlet:
   - Chọn outlet để lấy sản phẩm

3. Chọn sản phẩm:
   - Tìm sản phẩm "Xe máy Honda Wave"
   - Thêm vào order

4. Chọn thời gian thuê (tùy pricing type):
   
   **FIXED Pricing (Per Rental - Không care thời gian):**
   - Chọn ngày pickup: 15/01/2025 (optional, chỉ để tracking)
   - Chọn ngày return: 18/01/2025 (optional, chỉ để tracking)
   - Duration: Không áp dụng (không tính theo thời gian)
   - Total Price: 500,000 VND (cố định, không nhân duration)
   - Không cần validate duration limits

   **HOURLY Pricing:**
   - Chọn ngày thuê: 15/01/2025
   - Chọn giờ bắt đầu: 09:00
   - Chọn giờ kết thúc: 17:00
   - Duration: 8 hours (tự động tính)
   - Hệ thống validate: Min 1h ✅, Max 168h ✅

   **DAILY Pricing:**
   - Chọn ngày bắt đầu: 15/01/2025
   - Chọn ngày kết thúc: 18/01/2025
   - Duration: 3 days (tự động tính)
   - Hệ thống validate: Min 1d ✅, Max 30d ✅

5. Xem giá tự động tính:
   - **FIXED**: 500,000 VND (cố định, không nhân duration)
   - **HOURLY**: 
     - Nếu duration >= minDuration: 50,000 VND × duration × quantity
     - Nếu duration < minDuration: 50,000 VND × minDuration × quantity (minimum charge)
     - Ví dụ: minDuration = 2 hours, thuê 1 hour → Charge 2 hours = 100,000 VND
   - **DAILY**: 
     - Nếu duration >= minDuration: 200,000 VND × duration × quantity
     - Nếu duration < minDuration: 200,000 VND × minDuration × quantity (minimum charge)
     - Ví dụ: minDuration = 1 day, thuê 0.5 day → Charge 1 day = 200,000 VND

6. Nhập thông tin khác:
   - Deposit: 500,000 VND
   - Notes: (nếu có)

7. Tạo order:
   - Hệ thống validate duration limits
   - Nếu duration < minDuration → Warning + Minimum charge (tính theo minDuration)
   - Nếu duration > maxDuration → Warning (có thể vẫn tạo order)
   - Nếu hợp lệ → Tạo order thành công

### Bước 4: Tính giá tự động

**HOURLY Pricing:**
```
Product: Xe máy Honda Wave
Rent Price: 50,000 VND/hour
Duration: 8 hours
Total Price: 50,000 × 8 = 400,000 VND
Deposit: 500,000 VND
```

**DAILY Pricing:**
```
Product: Máy khoan Bosch
Rent Price: 200,000 VND/day
Duration: 3 days
Total Price: 200,000 × 3 = 600,000 VND
Deposit: 1,000,000 VND
```

**FIXED Pricing (Per Rental/Per Time - Không care thời gian):**
```
Product: Áo dài
Pricing Type: FIXED (Per Rental)
Rent Price: 500,000 VND/lần
Duration: Không áp dụng (không tính theo thời gian)
Total Price: 500,000 VND (dù thuê 1 ngày hay 3 ngày đều 500,000 VND)
Deposit: 200,000 VND

Ví dụ sử dụng:
- Khách thuê áo dài từ 15/01 đến 16/01 (1 ngày) → 500,000 VND
- Khách thuê áo dài từ 15/01 đến 18/01 (3 ngày) → 500,000 VND (cùng giá)
- Không care thời gian, chỉ tính theo lần thuê
```

## 4. Current Implementation & Future Extensions

### Current: Single Pricing Type per Product (Đã implement - Phase 1)

**Design Decision:** Mỗi sản phẩm chỉ có **1 pricing type** và **1 giá** (rentPrice)

**Lý do:**
- ✅ Đơn giản, dễ hiểu và maintain
- ✅ Phù hợp với Odoo/Rentman/Booqable (họ cũng dùng 1 pricing type per product)
- ✅ Đáp ứng 95% use cases thực tế
- ✅ Dễ mở rộng trong tương lai

**Use Case:** Mỗi sản phẩm có config riêng

**Ví dụ:**
```
Product "Xe máy Honda Wave": 
  - Pricing Type: HOURLY
  - Price: 50,000 VND/hour
  - Min: 2h, Max: 48h, Default: 4h

Product "Máy khoan Bosch": 
  - Pricing Type: DAILY
  - Price: 200,000 VND/day
  - Min: 1d, Max: 7d, Default: 3d

Product "Áo dài": 
  - Pricing Type: FIXED (Per Rental/Per Time)
  - Price: 500,000 VND/rental
  - Không cần duration limits (không tính theo thời gian)
```

**Current Limitation:**
- ❌ Không thể có nhiều pricing types cùng lúc (ví dụ: vừa HOURLY vừa DAILY)
- ❌ Không thể có pricing tiers (giá khác nhau cho các khoảng thời gian)
- ✅ **Workaround:** Nếu cần nhiều pricing types, tạo nhiều products riêng biệt

**Implementation:**
```typescript
// Product là source of truth duy nhất, không có fallback
const pricingType = product.pricingType || 'FIXED'; // Default FIXED nếu null
const rentPrice = product.rentPrice; // Single price for the pricing type
const durationLimits = product.durationConfig; // REQUIRED cho HOURLY/DAILY

// Không dùng merchant config trong logic
// Merchant config chỉ để suggest khi tạo product mới (UI convenience)
```

### Future Extension: Pricing Tiers (Phase 2 - Planned)

**Use Case:** Giá khác nhau cho các khoảng thời gian trong cùng 1 pricing type

**Ví dụ thực tế:**
```
Product "Xe máy Honda Wave" (HOURLY):
  - 1-3 hours: 50,000 VND/hour
  - 4-8 hours: 45,000 VND/hour (giảm giá cho thuê dài hạn)
  - 9+ hours: 40,000 VND/hour (giảm giá nhiều hơn)

Product "Máy khoan Bosch" (DAILY):
  - 1-2 days: 200,000 VND/day
  - 3-5 days: 180,000 VND/day
  - 6+ days: 150,000 VND/day
```

**Benefits:**
- ✅ Khuyến khích khách thuê dài hạn với giá tốt hơn
- ✅ Tối ưu hóa doanh thu và inventory turnover
- ✅ Linh hoạt hơn trong pricing strategy

**Planned Implementation:**
```typescript
// Thêm pricingTiers vào Product schema
Product {
  pricingType: 'HOURLY' | 'DAILY' | 'FIXED',
  rentPrice: number, // Base price (backward compatible - fallback nếu không có tiers)
  pricingTiers?: [  // Optional: Nếu có tiers thì dùng tiers, không thì dùng rentPrice
    { 
      minDuration: 1, 
      maxDuration: 3, 
      price: 50000,
      description?: "Short term rental"
    },
    { 
      minDuration: 4, 
      maxDuration: 8, 
      price: 45000,
      description?: "Medium term rental"
    },
    { 
      minDuration: 9, 
      maxDuration: 999, 
      price: 40000,
      description?: "Long term rental"
    }
]
}

// Pricing calculation logic sẽ tự động chọn tier phù hợp
function calculatePrice(product: Product, duration: number): number {
  if (product.pricingTiers && product.pricingTiers.length > 0) {
    // Tìm tier phù hợp với duration
    const tier = product.pricingTiers.find(
      t => duration >= t.minDuration && duration <= t.maxDuration
    );
    if (tier) {
      return tier.price * duration;
    }
  }
  // Fallback về rentPrice nếu không có tiers hoặc không tìm thấy tier
  return product.rentPrice * duration;
}
```

**Migration Path:**
- Existing products với `rentPrice` sẽ tiếp tục hoạt động bình thường
- Khi merchant muốn dùng pricing tiers, họ có thể thêm `pricingTiers` vào product
- Nếu có `pricingTiers`, hệ thống sẽ ưu tiên dùng tiers thay vì `rentPrice`
- Backward compatible: Products không có tiers vẫn dùng `rentPrice` như cũ

### Future: Weekly/Monthly Pricing

**Use Case:** Mở rộng thêm unit

**Implementation:**
```typescript
// Mở rộng PricingType enum
type PricingType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'FIXED';

// Calculation logic tự động xử lý
if (pricingType === 'WEEKLY') {
  duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 7));
  unit = 'week';
}
```

## 5. Implementation Plan

### Phase 1: Single Pricing Type per Product (✅ COMPLETED - Current)

**Status:** ✅ Đã implement và đang sử dụng

**Features:**
- ✅ **Product là source of truth** - mỗi product có pricing type và duration limits riêng
- ✅ Merchant chỉ là default khi tạo product mới (UI convenience)
- ✅ HOURLY, DAILY, FIXED pricing types
- ✅ Duration calculation và validation dựa trên product config
- ✅ UI để cấu hình pricing type và duration limits cho từng product
- ✅ Minimum charge logic (nếu duration < minDuration, charge cho minDuration)
- ✅ Type-safe enums và constants

**Current Limitation:**
- ❌ Mỗi product chỉ có 1 pricing type (HOURLY, DAILY, hoặc FIXED)
- ❌ Mỗi product chỉ có 1 giá (rentPrice)
- ❌ Không có pricing tiers (giá khác nhau cho các khoảng thời gian)

**Workaround:**
- Nếu cần nhiều pricing types, tạo nhiều products riêng biệt
- Ví dụ: "Xe máy - Thuê theo giờ" và "Xe máy - Thuê theo ngày"

### Phase 2: Pricing Tiers (📋 PLANNED - Future Extension)

**Status:** 📋 Planned for future implementation

**Features (Planned):**
- 📋 Pricing tiers cho HOURLY và DAILY pricing types
- 📋 Giá khác nhau cho các khoảng thời gian
- 📋 Backward compatible với Phase 1 (products không có tiers vẫn hoạt động)
- 📋 UI để cấu hình pricing tiers cho từng product
- 📋 Auto-calculation logic để chọn tier phù hợp với duration

**Migration Strategy:**
- Existing products với `rentPrice` sẽ tiếp tục hoạt động
- Optional field `pricingTiers` - nếu có thì dùng, không có thì dùng `rentPrice`
- No breaking changes - 100% backward compatible

### Phase 2: Advanced Features (Future)
- Pricing tiers (giá khác nhau cho các khoảng thời gian)
- Weekly/Monthly pricing types
- Discount based on duration
- Bulk pricing cho quantity lớn

### Phase 3: Smart Defaults (Future)
- AI suggestions cho pricing type dựa trên product name/description
- Auto-calculate duration limits dựa trên business type
- Template system để copy config từ product tương tự

