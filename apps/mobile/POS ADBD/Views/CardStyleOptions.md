# Card Style Options

## Tổng quan

PreviewViewController hiện hỗ trợ **6 card style options** để bạn có thể chọn style phù hợp nhất với design của app. Tất cả styles được quản lý qua biến `globalCardStyle` ở đầu file `PreviewCardCells.swift`.

## Các Card Style Options

### 1. `.flat` - Flat Style (Recommended for compact) ⭐
**Đặc điểm:**
- Corner radius: 0px (sharp corners)
- No shadow
- No border
- Vertical spacing: 0px (no spacing between cards)

**Phù hợp cho:**
- Apps muốn layout cực kỳ compact
- Flat design, không có visual distraction
- Tối đa hóa không gian hiển thị

### 2. `.bordered` - Bordered Style
**Đặc điểm:**
- Corner radius: 8px
- No shadow
- Border width: 1px
- Vertical spacing: 0px

**Phù hợp cho:**
- Flat design với border để phân tách
- Clean look, không shadow
- Compact layout

### 3. `.minimal` - Minimal Style
**Đặc điểm:**
- Corner radius: 8px
- Shadow opacity: 0.05 (rất nhẹ)
- Shadow radius: 2px
- Shadow offset: (0, 1)
- Vertical spacing: 4px

**Phù hợp cho:**
- Apps muốn look tối giản
- Subtle depth
- Ít visual distraction

### 4. `.modern` - Modern Style
**Đặc điểm:**
- Corner radius: 12px
- Shadow opacity: 0.1
- Shadow radius: 4px
- Shadow offset: (0, 2)
- Vertical spacing: 8px

**Phù hợp cho:**
- Modern iOS apps
- Clean và professional look
- Standard depth

### 5. `.clean` - Clean Style
**Đặc điểm:**
- Corner radius: 12px
- No shadow
- Border width: 0.5px
- Border color: Separator color
- Vertical spacing: 8px

**Phù hợp cho:**
- Flat design với border
- Clean, minimal look
- No shadow preference

### 6. `.elevated` - Elevated Style
**Đặc điểm:**
- Corner radius: 16px
- Shadow opacity: 0.15 (đậm hơn)
- Shadow radius: 8px
- Shadow offset: (0, 4)
- Vertical spacing: 12px

**Phù hợp cho:**
- Apps muốn depth rõ ràng
- Cards nổi bật hơn
- More visual hierarchy

## Cách sử dụng

Để thay đổi card style cho toàn bộ app, chỉ cần update biến `globalCardStyle` ở đầu file `PreviewCardCells.swift`:

```swift
// Ở đầu file PreviewCardCells.swift
var globalCardStyle: CardStyle = .flat  // Thay đổi thành .bordered, .minimal, .modern, .clean, hoặc .elevated
```

Tất cả cells sẽ tự động sử dụng style này.

## Vertical Spacing

Đã giảm vertical spacing:
- Header height: 32px (từ 44px)
- Header top offset: 4px (từ 12px)
- Card spacing: Tùy theo style (0px cho .flat và .bordered)

## Summary Card

Summary section sử dụng `SummaryCardCell` - một card duy nhất chứa tất cả summary items:
- Subtotal
- Discount
- Separator
- Grand Total
- Down Payment (nếu có)
- To Collect (highlighted)

Layout gọn gàng và dễ đọc hơn so với nhiều rows riêng lẻ.

