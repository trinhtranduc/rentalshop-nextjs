# PreviewViewController - Outlet & Staff Information Update

## Tổng quan
Đã cập nhật tất cả các option styles để bao gồm thông tin **Outlet** và **Nhân viên tạo đơn** (Staff).

## Thông tin cần hiển thị

### Outlet Information
- **Outlet Name** (`outletName`)
- **Outlet Address** (`outlet.address`) - Optional
- **Outlet Phone** (`outlet.phone`) - Optional
- **Merchant Name** (`merchantName`) - Optional

### Staff Information
- **Created By Name** (`createdByName`)
- **Created By ID** (`createdById`) - Có thể hiển thị nếu cần

## Cấu trúc Section mới

### Section 1: Outlet & Staff Information
**Vị trí:** Sau Customer Info, trước Date Information

**Nội dung:**
- Outlet Name (required)
- Outlet Address (optional)
- Outlet Phone (optional)
- Created By: Staff Name (required)

## Files đã cập nhật

### 1. PreviewViewController_Redesign_Plan.md
- ✅ Thêm Section 1: Outlet & Staff Information
- ✅ Cập nhật số thứ tự các sections (dates → section 2, deposit → section 3, etc.)

### 2. PreviewViewController_Option1_CardStyle.swift
- ✅ Thêm `outletInfo` case vào `PreviewSection` enum
- ✅ Thêm icon `building.2` cho outlet section
- ✅ Tạo `OutletInfoCardCell` class với:
  - Outlet name, address, phone
  - Staff name (Created By)
  - Card style với shadow và rounded corners
- ✅ Cập nhật layout structure trong comments

### 3. PreviewViewController_Option2_GroupedStyle.swift
- ✅ Cập nhật layout structure trong comments
- ✅ Thêm section Outlet & Staff Information

### 4. PreviewViewController_Option3_CompactStyle.swift
- ✅ Cập nhật layout structure trong comments
- ✅ Thêm section Outlet & Staff Information

### 5. PreviewViewController_Option4_TwoColumnStyle.swift
- ✅ Cập nhật layout structure cho two-column layout
- ✅ Outlet & Staff info có thể hiển thị cùng với Customer info

### 6. PreviewViewController_StyleComparison.md
- ✅ Thêm Outlet & Staff Info Cell vào Phase 2 checklist

## Implementation cần thêm

### 1. PreviewViewModelProtocol Extension
Cần thêm các computed properties để expose outlet và staff info:

```swift
extension PreviewViewModelProtocol {
    // Outlet Information
    var outletName: String { get }
    var outletAddress: String? { get }
    var outletPhone: String? { get }
    var merchantName: String? { get }
    
    // Staff Information
    var staffName: String { get }  // createdByName
    var staffId: Int { get }        // createdById (optional)
}
```

### 2. OrderViewModel Implementation
Cần implement các properties trong `OrderViewModel`:

```swift
// MARK: - Outlet Information
var outletName: String {
    order.outletName
}

var outletAddress: String? {
    // Nếu Order có outlet object với address
    // Hoặc có thể lấy từ OrderDetail nếu có
    nil // Cần check Order model structure
}

var outletPhone: String? {
    // Tương tự như address
    nil
}

var merchantName: String? {
    order.merchantName
}

// MARK: - Staff Information
var staffName: String {
    order.createdByName
}

var staffId: Int {
    order.createdById
}
```

### 3. CartViewModel Implementation
Nếu Cart cũng cần hiển thị outlet/staff info (có thể từ User.current hoặc Cart properties):

```swift
// MARK: - Outlet Information
var outletName: String {
    // Lấy từ User.current hoặc Cart properties
    User.account()?.outletName ?? "Default Outlet"
}

var staffName: String {
    User.account()?.fullName ?? "Unknown Staff"
}
```

### 4. PreviewViewController - Cell Configuration
Cần thêm case cho outlet section trong `cellForRowAt`:

```swift
case .outletInfo:
    let cell = tableView.dequeueReusableCell(
        withIdentifier: "OutletInfoCardCell", 
        for: indexPath
    ) as! OutletInfoCardCell
    
    cell.configure(
        outletName: viewModel.outletName,
        outletAddress: viewModel.outletAddress,
        outletPhone: viewModel.outletPhone,
        staffName: viewModel.staffName
    )
    
    return cell
```

## Data Source từ Order Model

Dựa trên Order model structure:

```swift
struct Order {
    // Outlet info
    let outletId: Int
    let outletName: String
    let merchantId: Int?
    let merchantName: String?
    
    // Staff info
    let createdById: Int
    let createdByName: String
}
```

**Lưu ý:** 
- Order model có `outletName` và `createdByName` (simplified data)
- OrderDetail có thể có full `outlet` và `createdBy` objects với đầy đủ thông tin
- Cần check xem có cần fetch OrderDetail để lấy address/phone không

## Testing Checklist

- [ ] Hiển thị outlet name đúng
- [ ] Hiển thị staff name đúng
- [ ] Ẩn address/phone nếu không có
- [ ] Layout đúng trên iPhone
- [ ] Layout đúng trên iPad (nếu Option 4)
- [ ] Card style hiển thị đẹp (Option 1)
- [ ] Grouped style hiển thị đẹp (Option 2)
- [ ] Compact style hiển thị đẹp (Option 3)
- [ ] Two-column layout hoạt động (Option 4)

## Next Steps

1. **Implement ViewModel properties** - Thêm outlet/staff properties vào PreviewViewModelProtocol và implementations
2. **Register cell** - Register OutletInfoCardCell trong PreviewViewController
3. **Update numberOfRowsInSection** - Thêm case cho outlet section
4. **Update cellForRowAt** - Thêm cell configuration cho outlet section
5. **Test** - Test trên các devices và với các data scenarios

