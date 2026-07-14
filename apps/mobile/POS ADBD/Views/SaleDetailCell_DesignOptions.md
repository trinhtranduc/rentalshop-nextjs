# SaleDetailCell - Design Options

## Option 1: Card Style với Shadow (Modern Card)
**Phong cách:** iOS Card Design với subtle shadow và rounded corners

**Đặc điểm:**
- Card container với shadow nhẹ (elevation effect)
- Rounded corners (12px radius)
- Padding lớn hơn (16px vertical, 16px horizontal)
- Status badge với pill shape (rounded corners lớn hơn)
- Dates được group trong một container riêng với background nhẹ
- Separator line giữa các sections

**Ưu điểm:**
- Modern, professional
- Dễ phân biệt từng cell
- Phù hợp với iOS design language

---

## Option 2: Minimalist Clean (Ultra Clean)
**Phong cách:** Tối giản, spacing lớn, typography rõ ràng

**Đặc điểm:**
- Không có shadow, border nhẹ ở bottom
- Spacing lớn giữa các elements (8px vertical spacing)
- Typography hierarchy rõ ràng (size chênh lệch lớn hơn)
- Status badge nhỏ gọn, subtle
- Dates inline với icon nhỏ thay vì title
- White background với subtle gray separator

**Ưu điểm:**
- Clean, dễ đọc
- Tập trung vào content
- Phù hợp cho danh sách dài

---

## Option 3: Information Dense (Compact & Efficient)
**Phong cách:** Tối ưu không gian, hiển thị nhiều thông tin gọn gàng

**Đặc điểm:**
- Compact spacing (4px vertical, 8px horizontal)
- Dates dạng chip/badge nhỏ
- Status badge pill shape
- Item count và total amount cùng một row
- Customer info inline với order number
- Subtle background color cho dates section

**Ưu điểm:**
- Hiển thị nhiều thông tin trong không gian nhỏ
- Phù hợp cho iPad hoặc màn hình lớn
- Efficient use of space

---

## Option 4: Modern iOS Style (iOS 17+ Design Language)
**Phong cách:** Theo design language của iOS mới nhất

**Đặc điểm:**
- Rounded corners nhẹ (8px)
- Subtle background tint (systemGray6)
- Status badge với dynamic color
- Dates với SF Symbols icons
- Haptic feedback ready
- Proper content insets và safe area

**Ưu điểm:**
- Native iOS feel
- Consistent với system apps
- Accessibility friendly

---

## Recommendation

**Tôi recommend Option 1 (Card Style)** vì:
1. Modern và professional
2. Dễ phân biệt từng order
3. Phù hợp với business app
4. Visual hierarchy rõ ràng
5. Không quá phức tạp

Bạn muốn tôi implement option nào? Hoặc bạn muốn tôi combine các elements từ nhiều options?

