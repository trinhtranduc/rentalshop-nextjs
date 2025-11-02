# 📋 Manual Testing Checklist

Checklist để test thủ công các tính năng chính của Rental Shop application.

---

## 🔐 **1. ĐĂNG NHẬP VÀ ĐĂNG KÝ**

### 1.1 Đăng ký tài khoản mới
- [ ] Truy cập trang đăng ký
- [ ] Điền đầy đủ thông tin bắt buộc (email, mật khẩu, tên, số điện thoại)
- [ ] Xác nhận đăng ký thành công
- [ ] Kiểm tra email xác thực được gửi (nếu bật verification)

### 1.2 Tự động tạo outlet và category mặc định
Khi tạo tài khoản merchant, hệ thống sẽ tự động tạo:
- [ ] **1 Outlet mặc định** (không thể xóa)
  - [ ] Outlet có tên mặc định (ví dụ: "Outlet 1" hoặc tên merchant)
  - [ ] Có `isDefault: true` trong database
  - [ ] Không xuất hiện nút "Xóa" trong danh sách outlets
  - [ ] Không thể xóa thông qua API
  
- [ ] **1 Category mặc định** (không thể xóa)
  - [ ] Category có tên mặc định (ví dụ: "Chưa phân loại" hoặc "Default")
  - [ ] Có `isDefault: true` trong database
  - [ ] Không xuất hiện nút "Xóa" trong danh sách categories
  - [ ] Không thể xóa thông qua API

### 1.3 Kiểm tra thông tin đăng nhập sau khởi tạo
- [ ] Đăng xuất và đăng nhập lại với tài khoản vừa tạo
- [ ] Kiểm tra thông tin user hiển thị đúng
- [ ] Kiểm tra outlet mặc định được chọn tự động
- [ ] Kiểm tra category mặc định xuất hiện trong dropdown khi tạo sản phẩm
- [ ] Kiểm tra phân quyền đúng (MERCHANT có quyền tạo, sửa, xóa)

---

## 📊 **2. DASHBOARD**

### 2.1 Tạo dữ liệu test
Trước khi test dashboard, cần tạo dữ liệu:
- [ ] Tạo ít nhất 5 sản phẩm
- [ ] Tạo ít nhất 10 khách hàng
- [ ] Tạo ít nhất 15 đơn hàng với các trạng thái khác nhau:
  - [ ] RESERVED (3 đơn)
  - [ ] PICKUPED (5 đơn)
  - [ ] RETURNED (4 đơn)
  - [ ] COMPLETED (3 đơn)

### 2.2 Kiểm tra Dashboard Today (Hôm nay)
- [ ] **Tổng quan số liệu:**
  - [ ] Tổng doanh thu hôm nay
  - [ ] Tổng số đơn hàng hôm nay
  - [ ] Số khách hàng mới hôm nay
  - [ ] Số sản phẩm đang cho thuê (PICKUPED)
  
- [ ] **Biểu đồ hôm nay:**
  - [ ] Biểu đồ doanh thu theo giờ
  - [ ] Biểu đồ đơn hàng theo trạng thái
  - [ ] Dữ liệu hiển thị đúng với các đơn hàng tạo hôm nay
  
- [ ] **Danh sách đơn hàng hôm nay:**
  - [ ] Chỉ hiển thị đơn hàng được tạo hôm nay
  - [ ] Đếm số lượng đúng
  - [ ] Thông tin từng đơn hàng chính xác

### 2.3 Kiểm tra Dashboard Tháng (This Month)
- [ ] **Tổng quan số liệu:**
  - [ ] Tổng doanh thu tháng này
  - [ ] Tổng số đơn hàng tháng này
  - [ ] Số khách hàng mới tháng này
  - [ ] So sánh với tháng trước (tăng/giảm %)
  
- [ ] **Biểu đồ tháng:**
  - [ ] Biểu đồ doanh thu theo ngày
  - [ ] Biểu đồ đơn hàng theo ngày
  - [ ] Xem được xu hướng trong tháng
  
- [ ] **Danh sách đơn hàng tháng này:**
  - [ ] Chỉ hiển thị đơn hàng trong tháng hiện tại
  - [ ] Đếm số lượng đúng
  - [ ] Phân trang hoạt động đúng

### 2.4 Kiểm tra Dashboard Năm (This Year)
- [ ] **Tổng quan số liệu:**
  - [ ] Tổng doanh thu năm này
  - [ ] Tổng số đơn hàng năm này
  - [ ] Số khách hàng mới năm này
  - [ ] Trung bình doanh thu/tháng
  
- [ ] **Biểu đồ năm:**
  - [ ] Biểu đồ doanh thu theo tháng
  - [ ] Biểu đồ đơn hàng theo tháng
  - [ ] Xem được xu hướng cả năm
  
- [ ] **Top sản phẩm:**
  - [ ] Sản phẩm cho thuê nhiều nhất
  - [ ] Sản phẩm có doanh thu cao nhất
  - [ ] Số liệu chính xác

### 2.5 Kiểm tra Date Range Picker
- [ ] Chọn khoảng thời gian tùy ý
- [ ] Dashboard cập nhật đúng với khoảng thời gian đã chọn
- [ ] Số liệu tính toán chính xác
- [ ] Không có lỗi khi chọn các ngày khác nhau

---

## 📦 **3. ĐƠN HÀNG (ORDERS)**

### 3.1 Tạo đơn hàng
- [ ] Click nút "Tạo đơn hàng mới"
- [ ] Chọn loại đơn hàng (RENT hoặc SALE)
- [ ] Chọn khách hàng (hoặc tạo mới nếu chưa có)
- [ ] Chọn sản phẩm từ danh sách
- [ ] Nhập số lượng
- [ ] Nhập thông tin thuê (nếu RENT):
  - [ ] Ngày bắt đầu thuê
  - [ ] Ngày dự kiến trả
  - [ ] Số tiền cọc
- [ ] Kiểm tra tổng tiền tự động tính
- [ ] Xác nhận tạo đơn hàng
- [ ] Thông báo tạo thành công
- [ ] Đơn hàng xuất hiện trong danh sách với trạng thái RESERVED

### 3.2 Cập nhật đơn hàng
- [ ] Click vào đơn hàng cần sửa
- [ ] Sửa thông tin:
  - [ ] Thêm/bớt sản phẩm
  - [ ] Thay đổi số lượng
  - [ ] Thay đổi khách hàng
  - [ ] Cập nhật thông tin thuê (ngày bắt đầu, ngày trả)
- [ ] Lưu thay đổi
- [ ] Thông báo cập nhật thành công
- [ ] Thông tin đơn hàng được cập nhật trong danh sách

### 3.3 Cập nhật trạng thái đơn hàng
**Flow cho đơn RENT:**
- [ ] **RESERVED → PICKUPED:**
  - [ ] Chọn đơn hàng trạng thái RESERVED
  - [ ] Click "Xác nhận lấy hàng"
  - [ ] Trạng thái chuyển sang PICKUPED
  - [ ] Sản phẩm chuyển sang trạng thái "Đang cho thuê"
  
- [ ] **PICKUPED → RETURNED:**
  - [ ] Chọn đơn hàng trạng thái PICKUPED
  - [ ] Click "Xác nhận trả hàng"
  - [ ] Trạng thái chuyển sang RETURNED
  - [ ] Sản phẩm chuyển sang trạng thái "Có sẵn"

**Flow cho đơn SALE:**
- [ ] **RESERVED → COMPLETED:**
  - [ ] Chọn đơn hàng trạng thái RESERVED
  - [ ] Click "Xác nhận hoàn thành"
  - [ ] Trạng thái chuyển sang COMPLETED
  - [ ] Trừ số lượng sản phẩm trong kho

**Hủy đơn:**
- [ ] Chọn đơn hàng bất kỳ
- [ ] Click "Hủy đơn hàng"
- [ ] Xác nhận hủy
- [ ] Trạng thái chuyển sang CANCELLED
- [ ] Sản phẩm được trả về kho (nếu đã lấy hàng)

### 3.4 Search và Filter đơn hàng
**Search:**
- [ ] Search theo số đơn hàng (orderNumber)
- [ ] Search theo tên khách hàng
- [ ] Search theo số điện thoại
- [ ] Kết quả hiển thị chính xác và real-time

**Filter:**
- [ ] Filter theo trạng thái:
  - [ ] RESERVED
  - [ ] PICKUPED
  - [ ] RETURNED
  - [ ] COMPLETED
  - [ ] CANCELLED
  
- [ ] Filter theo loại đơn:
  - [ ] RENT
  - [ ] SALE
  
- [ ] Filter theo khoảng thời gian:
  - [ ] Hôm nay
  - [ ] 7 ngày qua
  - [ ] Tháng này
  - [ ] Tùy chọn

- [ ] Kết hợp nhiều filter:
  - [ ] Trạng thái + Loại đơn
  - [ ] Trạng thái + Khoảng thời gian
  - [ ] Tất cả filters

**Sắp xếp:**
- [ ] Sắp xếp theo ngày tạo (mới nhất → cũ nhất)
- [ ] Sắp xếp theo ngày tạo (cũ nhất → mới nhất)
- [ ] Sắp xếp theo tổng tiền (cao → thấp)
- [ ] Sắp xếp theo tổng tiền (thấp → cao)

**Phân trang:**
- [ ] Hiển thị đúng số lượng đơn hàng mỗi trang (10, 20, 50, 100)
- [ ] Chuyển trang hoạt động đúng
- [ ] Số trang hiển thị chính xác

---

## 🏷️ **4. SẢN PHẨM (PRODUCTS)**

### 4.1 Tạo sản phẩm
- [ ] Click nút "Thêm sản phẩm mới"
- [ ] Điền đầy đủ thông tin:
  - [ ] Tên sản phẩm (bắt buộc)
  - [ ] Mã SKU/Barcode (tùy chọn)
  - [ ] Giá thuê (bắt buộc)
  - [ ] Tiền cọc (tùy chọn)
  - [ ] Danh mục (chọn category mặc định hoặc category khác)
  - [ ] Mô tả sản phẩm
  - [ ] Upload hình ảnh (nếu có)
  
- [ ] Kiểm tra validation:
  - [ ] Không cho phép tạo khi thiếu tên sản phẩm
  - [ ] Không cho phép tạo khi thiếu giá thuê
  - [ ] Giá thuê phải là số dương
  
- [ ] Xác nhận tạo sản phẩm
- [ ] Thông báo tạo thành công
- [ ] Sản phẩm xuất hiện trong danh sách

### 4.2 Cập nhật sản phẩm
- [ ] Click vào sản phẩm cần sửa
- [ ] Sửa thông tin:
  - [ ] Đổi tên
  - [ ] Đổi giá
  - [ ] Thay đổi danh mục
  - [ ] Cập nhật mô tả
  - [ ] Thay đổi hình ảnh
  
- [ ] Lưu thay đổi
- [ ] Thông báo cập nhật thành công
- [ ] Thông tin sản phẩm được cập nhật trong danh sách

### 4.3 Kiểm tra số lượng sản phẩm
**Cập nhật số lượng:**
- [ ] Thêm số lượng vào kho
- [ ] Trừ số lượng khỏi kho
- [ ] Xem chi tiết số lượng:
  - [ ] Số lượng tổng (stock)
  - [ ] Số lượng đang cho thuê (renting)
  - [ ] Số lượng còn lại (available = stock - renting)

**Tự động cập nhật khi có đơn hàng:**
- [ ] Tạo đơn RENT → available giảm
- [ ] Tạo đơn SALE → stock và available đều giảm
- [ ] Xác nhận trả hàng → available tăng
- [ ] Hủy đơn → available tăng lại

### 4.4 Search và Filter sản phẩm
**Search:**
- [ ] Search theo tên sản phẩm
- [ ] Search theo SKU/Barcode
- [ ] Search theo danh mục
- [ ] Kết quả hiển thị chính xác và real-time

**Filter:**
- [ ] Filter theo danh mục (category)
- [ ] Filter theo trạng thái:
  - [ ] Tất cả
  - [ ] Còn hàng (available > 0)
  - [ ] Hết hàng (available = 0)
  - [ ] Đang cho thuê (renting > 0)
  
- [ ] Filter theo khoảng giá:
  - [ ] Giá thấp → giá cao
  - [ ] Custom range

**Sắp xếp:**
- [ ] Sắp xếp theo tên A-Z
- [ ] Sắp xếp theo tên Z-A
- [ ] Sắp xếp theo giá (cao → thấp)
- [ ] Sắp xếp theo giá (thấp → cao)
- [ ] Sắp xếp theo số lượng (nhiều → ít)
- [ ] Sắp xếp theo số lượng (ít → nhiều)

**Phân trang:**
- [ ] Hiển thị đúng số lượng sản phẩm mỗi trang
- [ ] Chuyển trang hoạt động đúng
- [ ] Số trang hiển thị chính xác

---

## 👥 **5. KHÁCH HÀNG (CUSTOMERS)**

### 5.1 Tạo khách hàng
- [ ] Click nút "Thêm khách hàng mới"
- [ ] Điền đầy đủ thông tin:
  - [ ] Họ và tên (bắt buộc)
  - [ ] Số điện thoại (bắt buộc)
  - [ ] Email (tùy chọn)
  - [ ] Địa chỉ
  - [ ] Ghi chú
  
- [ ] Kiểm tra validation:
  - [ ] Không cho phép tạo khi thiếu tên
  - [ ] Không cho phép tạo khi thiếu số điện thoại
  - [ ] Số điện thoại phải đúng format
  
- [ ] Xác nhận tạo khách hàng
- [ ] Thông báo tạo thành công
- [ ] Khách hàng xuất hiện trong danh sách

### 5.2 Cập nhật khách hàng
- [ ] Click vào khách hàng cần sửa
- [ ] Sửa thông tin
- [ ] Lưu thay đổi
- [ ] Thông báo cập nhật thành công

### 5.3 Xem lịch sử khách hàng
- [ ] Click vào khách hàng
- [ ] Xem tab "Lịch sử đơn hàng"
- [ ] Danh sách đơn hàng hiển thị đúng
- [ ] Thống kê tổng số đơn, tổng tiền

### 5.4 Search và Filter khách hàng
**Search:**
- [ ] Search theo tên
- [ ] Search theo số điện thoại
- [ ] Search theo email

**Filter:**
- [ ] Filter theo nhóm (nếu có)
- [ ] Filter theo khách hàng mới/thân thiết

---

## ⚙️ **6. CÀI ĐẶT & PHÂN QUYỀN**

### 6.1 Cài đặt Outlet
- [ ] Xem danh sách outlet
- [ ] Tạo outlet mới (trừ outlet mặc định)
- [ ] Sửa thông tin outlet
- [ ] Không thể xóa outlet mặc định
- [ ] Chuyển đổi outlet khi làm việc

### 6.2 Cài đặt Category
- [ ] Xem danh sách category
- [ ] Tạo category mới (trừ category mặc định)
- [ ] Sửa thông tin category
- [ ] Xóa category (trừ category mặc định)
- [ ] Không thể xóa category mặc định

### 6.3 Quản lý User
- [ ] Xem danh sách user
- [ ] Tạo user mới
- [ ] Phân quyền đúng (OUTLET_ADMIN, OUTLET_STAFF)
- [ ] Sửa thông tin user
- [ ] Khóa/Mở khóa user

---

## 🔔 **7. THÔNG BÁO & LỖI**

### 7.1 Thông báo thành công
- [ ] Tạo mới thành công
- [ ] Cập nhật thành công
- [ ] Xóa thành công
- [ ] Toast notification hiển thị đúng

### 7.2 Thông báo lỗi
- [ ] Validation errors hiển thị rõ ràng
- [ ] Lỗi network được xử lý đúng
- [ ] Lỗi permission hiển thị thông báo phù hợp
- [ ] Error messages bằng tiếng Việt (nếu có)

---

## 🎨 **8. UI/UX**

### 8.1 Responsive Design
- [ ] Hiển thị đúng trên desktop (> 1024px)
- [ ] Hiển thị đúng trên tablet (768px - 1024px)
- [ ] Hiển thị đúng trên mobile (< 768px)
- [ ] Navigation menu hoạt động đúng trên mobile

### 8.2 Loading States
- [ ] Hiển thị loading khi fetch data
- [ ] Hiển thị skeleton screens
- [ ] Không bị giật/lag khi loading

### 8.3 Dark Mode (nếu có)
- [ ] Chuyển đổi light/dark mode
- [ ] Theme được lưu lại khi reload
- [ ] Màu sắc hiển thị đúng ở cả 2 chế độ

---

## 📱 **9. PERFORMANCE**

### 9.1 Load Time
- [ ] Dashboard load trong < 2 giây
- [ ] Danh sách load trong < 1 giây
- [ ] Tạo mới/sửa trong < 1 giây

### 9.2 Smooth Interactions
- [ ] Không có lag khi scroll
- [ ] Search real-time mượt mà
- [ ] Filter instant
- [ ] Hover/click effects mượt

---

## 🔄 **10. TÍNH NĂNG NÂNG CAO (Nếu có)**

### 10.1 Calendar View
- [ ] Hiển thị calendar với các đơn hàng
- [ ] Click vào ngày xem chi tiết
- [ ] Drag & drop thay đổi ngày (nếu có)

### 10.2 Báo cáo xuất
- [ ] Xuất Excel đơn hàng
- [ ] Xuất PDF báo cáo
- [ ] Format file đúng

### 10.3 Nhắc nhở
- [ ] Nhắc đơn sắp đến hạn trả
- [ ] Nhắc đơn quá hạn
- [ ] Push notification (nếu có)

---

## ✅ **SUMMARY**

Sau khi hoàn thành checklist này:
- [ ] Tất cả tính năng chính hoạt động ổn định
- [ ] Không có lỗi critical
- [ ] UI/UX mượt mà và dễ sử dụng
- [ ] Performance đạt yêu cầu
- [ ] Data integrity được đảm bảo

---

**Lưu ý:**
- Checklist này dùng cho testing thủ công trước khi deploy production
- Nên test trên environment staging trước
- Document lại mọi bug/issue phát hiện được

**Người test:** ________________________

**Ngày test:** ________________________

**Kết quả:** ☐ Pass  ☐ Fail

**Ghi chú:**
_______________________________________
_______________________________________
_______________________________________

