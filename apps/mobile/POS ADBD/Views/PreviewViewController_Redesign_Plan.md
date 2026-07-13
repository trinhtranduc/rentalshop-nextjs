# PreviewViewController Redesign Plan

## Mục tiêu
- Di chuyển tất cả nội dung vào TableView với sections
- Chỉ giữ buttons cố định ở bottom
- Tổ chức thông tin rõ ràng theo sections

## Cấu trúc Sections đề xuất

### Section 0: Thông tin khách hàng (Customer Info)
- **Rows:**
  - Customer Name (có thể tap để call)
  - Phone Number (có thể tap để call)
  - Customer Address (nếu có)

### Section 1: Thông tin Outlet & Nhân viên (Outlet & Staff Info)
- **Rows:**
  - Outlet Name
  - Outlet Address (nếu có)
  - Outlet Phone (nếu có)
  - Nhân viên tạo đơn (Created By)
  - Staff Name (tên nhân viên)

### Section 2: Thông tin ngày (Date Information)
- **Rows:**
  - Create Date
  - Pickup Date
  - Return Date
  - Ready to Deliver (checkbox - chỉ cho rent orders)

### Section 3: Thông tin Document & Deposit (chỉ cho rent orders)
- **Rows:**
  - Document/Material (text field)
  - Security Deposit (button với picker)
  - Damage Fee (button với picker)

### Section 4: Danh sách sản phẩm (Products)
- **Rows:** Dynamic - mỗi product một row
- Sử dụng ProductPreviewCell hiện tại

### Section 5: Ghi chú (Notes)
- **Rows:**
  - Note Text (tap để edit)

### Section 6: Tổng kết giá (Summary)
- **Rows:**
  - Subtotal
  - Discount
  - Grand Total
  - Down Payment (chỉ cho rent orders)
  - To Collect (highlighted)

---

## Option Styles

### Option 1: Card Style (Modern Card Design)
**Đặc điểm:**
- Mỗi section là một card riêng biệt với shadow và rounded corners
- Spacing lớn giữa các cards
- Background màu sáng, cards màu trắng
- Section headers có icon và title rõ ràng

**Ưu điểm:**
- Modern, clean look
- Dễ đọc, phân tách rõ ràng
- Phù hợp với iOS design guidelines

**Nhược điểm:**
- Chiếm nhiều không gian vertical
- Có thể scroll nhiều

---

### Option 2: Grouped Style (iOS Native)
**Đặc điểm:**
- Sử dụng UITableViewStyle.grouped
- Section headers/footers mặc định của iOS
- Background màu group table view
- Separators giữa các rows

**Ưu điểm:**
- Native iOS feel
- Dễ implement
- Familiar với người dùng iOS

**Nhược điểm:**
- Ít customization
- Có thể trông đơn giản

---

### Option 3: Compact List Style
**Đặc điểm:**
- Dense information layout
- Minimal spacing
- Inline editing cho các fields
- Summary section sticky ở bottom (trước buttons)

**Ưu điểm:**
- Hiển thị nhiều thông tin trong một màn hình
- Scroll ít hơn
- Phù hợp cho màn hình nhỏ

**Nhược điểm:**
- Có thể trông chật chội
- Khó đọc hơn

---

### Option 4: Two-Column Layout (iPad Optimized)
**Đặc điểm:**
- Customer info và Dates ở 2 columns
- Products full width
- Notes và Summary side by side
- Tận dụng không gian màn hình lớn

**Ưu điểm:**
- Tối ưu cho iPad
- Hiển thị nhiều thông tin cùng lúc
- Professional look

**Nhược điểm:**
- Phức tạp hơn về layout
- Cần responsive cho iPhone

---

### Option 5: Minimalist Style
**Đặc điểm:**
- Tối giản, chỉ essential information
- Subtle separators
- Large typography cho important info
- Màu sắc tối giản

**Ưu điểm:**
- Clean, professional
- Focus vào content
- Modern aesthetic

**Nhược điểm:**
- Có thể thiếu visual hierarchy
- Ít visual interest

---

### Option 6: Invoice/Receipt Style
**Đặc điểm:**
- Layout giống hóa đơn
- Header với logo/title
- Line items cho products
- Summary section giống invoice footer
- Print-friendly design

**Ưu điểm:**
- Familiar format
- Professional business look
- Dễ in ấn

**Nhược điểm:**
- Có thể trông cứng nhắc
- Ít interactive elements

---

## Implementation Strategy

### Phase 1: Section Structure
1. Tạo enum `PreviewSection` để quản lý sections
2. Implement `numberOfSections` và `numberOfRowsInSection`
3. Tạo custom cells cho mỗi section type

### Phase 2: Custom Cells
1. `CustomerInfoCell` - Hiển thị customer name, phone
2. `DateInfoCell` - Hiển thị dates với format đẹp
3. `DocumentDepositCell` - Text field và buttons cho deposit
4. `ProductPreviewCell` - Giữ nguyên hoặc cải thiện
5. `NoteCell` - Text view cho notes
6. `SummaryRowCell` - Mỗi row cho một summary item

### Phase 3: Section Headers
1. Custom header views cho mỗi section
2. Icons và titles rõ ràng
3. Optional: Collapsible sections

### Phase 4: Footer Buttons
1. Giữ buttons ở bottom (không scroll)
2. Sticky footer view
3. Responsive layout cho iPad/iPhone

---

## Recommended Approach

**Tôi đề xuất Option 1 (Card Style) vì:**
- Modern và professional
- Dễ đọc và navigate
- Phù hợp với design system hiện tại
- Có thể customize dễ dàng

**Hoặc Option 2 (Grouped Style) nếu muốn:**
- Implement nhanh
- Native iOS feel
- Ít customization cần thiết

---

## Next Steps
1. Chọn style option
2. Implement section structure
3. Tạo custom cells
4. Migrate logic từ header/footer vào cells
5. Test và refine

