# SaleDetailCell - New Design Options

## Tổng quan
Các design options mới được tạo để giải quyết vấn đề "khó phân biệt 2 cell" với các phong cách hiện đại và clean.

---

## Option 4: Modern với Left Accent Border ⭐

### Đặc điểm:
- **Left accent border** (4px) với màu theo status
  - Reserved: Đỏ
  - Picked Up: Cam
  - Returned/Completed: Xanh dương
  - Cancelled: Đỏ đậm
- **Rounded corners** (8px) cho container
- **Spacing tốt** giữa các cells (4px top/bottom, 8px left/right)
- **White background** với visual separation rõ ràng

### Ưu điểm:
✅ Dễ phân biệt cells nhờ accent border màu sắc  
✅ Màu border giúp nhận biết status ngay lập tức  
✅ Clean và modern  
✅ Không cần alternating background colors

### Phù hợp cho:
- Người dùng muốn visual feedback nhanh về status
- App cần highlight status một cách rõ ràng

---

## Option 5: Clean với Subtle Border

### Đặc điểm:
- **Subtle border** (1px) với màu separator nhạt
- **Rounded corners** (10px) cho container
- **Spacing tốt** giữa các cells (6px top/bottom, 12px left/right)
- **White background** với border mỏng

### Ưu điểm:
✅ Dễ phân biệt cells nhờ border  
✅ Clean và minimalist  
✅ Không quá nổi bật, professional  
✅ Phù hợp với design system hiện tại

### Phù hợp cho:
- App cần look professional và clean
- Người dùng muốn subtle visual separation

---

## Option 6: Minimalist Card với Shadow

### Đặc điểm:
- **Card style** với shadow nhẹ (opacity 0.08)
- **Rounded corners** (12px) cho container
- **Spacing tốt** giữa các cells (6px top/bottom, 12px left/right)
- **White background** với depth effect

### Ưu điểm:
✅ Dễ phân biệt cells nhờ shadow  
✅ Modern card design  
✅ Depth effect tạo cảm giác 3D  
✅ Clean và elegant

### Phù hợp cho:
- App muốn modern card-based UI
- Người dùng thích depth và layering

---

## So sánh nhanh

| Feature | Option 4 | Option 5 | Option 6 |
|---------|----------|----------|----------|
| **Visual Separation** | Accent border (màu) | Subtle border | Shadow |
| **Status Indicator** | Border màu theo status | Badge only | Badge only |
| **Modern Look** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Clean** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Professional** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Recommendation

**Option 4 (Accent Border)** được recommend vì:
1. ✅ Giải quyết tốt vấn đề "khó phân biệt cells"
2. ✅ Status được highlight rõ ràng qua màu border
3. ✅ Modern và clean
4. ✅ Visual feedback tốt cho người dùng

**Option 5 (Clean Border)** phù hợp nếu:
- Muốn subtle hơn
- Không cần status highlight quá rõ

**Option 6 (Card Shadow)** phù hợp nếu:
- Muốn card-based design
- Thích depth effect

---

## Cách sử dụng

Trong `SaleViewController.swift`, thay đổi:

```swift
// Option 4
tbv.register(SaleDetailCell_Option4.self, forCellReuseIdentifier: "SaleDetailCell_Option4")
let cell = tableView.dequeueReusableCell(withIdentifier: "SaleDetailCell_Option4", for: indexPath) as! SaleDetailCell_Option4

// Option 5
tbv.register(SaleDetailCell_Option5.self, forCellReuseIdentifier: "SaleDetailCell_Option5")
let cell = tableView.dequeueReusableCell(withIdentifier: "SaleDetailCell_Option5", for: indexPath) as! SaleDetailCell_Option5

// Option 6
tbv.register(SaleDetailCell_Option6.self, forCellReuseIdentifier: "SaleDetailCell_Option6")
let cell = tableView.dequeueReusableCell(withIdentifier: "SaleDetailCell_Option6", for: indexPath) as! SaleDetailCell_Option6
```

**Lưu ý:** Với Option 4, 5, 6, không cần set alternating background colors vì đã có visual separation rõ ràng.

