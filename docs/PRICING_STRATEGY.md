# Pricing Strategy & Future Extensions

## Current Implementation (Phase 1)

### Single Pricing Type per Product

**Design:** Mỗi sản phẩm chỉ có **1 pricing type** và **1 giá** (rentPrice)

**Supported Pricing Types:**
- **FIXED**: Giá cố định cho mỗi lần thuê (không tính theo thời gian)
- **HOURLY**: Tính theo giờ
- **DAILY**: Tính theo ngày

**Example:**
```
Product "Xe máy Honda Wave":
  - pricingType: HOURLY
  - rentPrice: 50,000 VND/hour
  - durationConfig: { min: 2h, max: 48h, default: 4h }
```

### Current Limitations

1. **Single Pricing Type:** Không thể có nhiều pricing types cùng lúc
   - ❌ Không thể vừa HOURLY vừa DAILY cho cùng 1 product
   - ✅ **Workaround:** Tạo nhiều products riêng biệt

2. **Single Price:** Không thể có giá khác nhau cho các khoảng thời gian
   - ❌ Không thể có pricing tiers (ví dụ: 1-3h: 50k/h, 4-8h: 45k/h)
   - ✅ **Workaround:** Sẽ được implement trong Phase 2

## Future Extension (Phase 2 - Planned)

### Pricing Tiers

**Use Case:** Giá khác nhau cho các khoảng thời gian trong cùng 1 pricing type

**Example:**
```
Product "Xe máy Honda Wave" (HOURLY):
  - Tier 1: 1-3 hours → 50,000 VND/hour
  - Tier 2: 4-8 hours → 45,000 VND/hour (giảm giá cho thuê dài hạn)
  - Tier 3: 9+ hours → 40,000 VND/hour (giảm giá nhiều hơn)
```

**Benefits:**
- ✅ Khuyến khích khách thuê dài hạn
- ✅ Tối ưu hóa doanh thu
- ✅ Linh hoạt trong pricing strategy

**Planned Schema:**
```typescript
Product {
  pricingType: 'HOURLY' | 'DAILY' | 'FIXED',
  rentPrice: number, // Base price (backward compatible)
  pricingTiers?: [  // Optional: Nếu có thì dùng tiers, không thì dùng rentPrice
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
    }
  ]
}
```

**Migration Strategy:**
- ✅ 100% backward compatible
- ✅ Existing products với `rentPrice` tiếp tục hoạt động
- ✅ Optional field `pricingTiers` - nếu có thì dùng, không có thì dùng `rentPrice`
- ✅ No breaking changes

## Comparison with Other Systems

### Odoo Rental Module
- ✅ Single pricing type per product (giống chúng ta)
- ✅ Supports pricing tiers (chúng ta sẽ implement trong Phase 2)
- ✅ Price history tracking (có thể thêm trong tương lai)

### Rentman
- ✅ Single pricing type per product
- ✅ Supports pricing tiers
- ✅ Flexible duration units (Hour, Day, Week, Month)

### Booqable
- ✅ Single pricing type per product
- ✅ Supports pricing tiers
- ✅ Clear UI với duration unit labels

## Decision Summary

**Current (Phase 1):**
- ✅ Giữ nguyên: 1 pricing type per product
- ✅ Đơn giản, dễ maintain
- ✅ Phù hợp với 95% use cases

**Future (Phase 2):**
- 📋 Implement Pricing Tiers
- 📋 Backward compatible
- 📋 Optional feature - không bắt buộc

**Why This Approach:**
1. **Simplicity First:** Bắt đầu đơn giản, mở rộng khi cần
2. **Industry Standard:** Phù hợp với Odoo/Rentman/Booqable
3. **Backward Compatible:** Không breaking changes khi mở rộng
4. **Flexible:** Có thể mở rộng thêm features khác sau này

