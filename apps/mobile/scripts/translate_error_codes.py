#!/usr/bin/env python3
"""
Script to translate error codes from English to Vietnamese
"""

import json
import re

# Read English errors.json
with open('/Users/trinhtran/Documents/Source Code/rentalshop-nextjs/locales/en/errors.json', 'r') as f:
    errors_en = json.load(f)

# Translation mapping
translations = {
    # Authentication & Authorization
    "Access denied to this resource": "Truy cập bị từ chối tài nguyên này",
    "Access token is required": "Yêu cầu mã truy cập",
    "Account deleted successfully": "Đã xóa tài khoản thành công",
    "All non-cancelled orders have valid amounts": "Tất cả đơn hàng chưa hủy đều có số tiền hợp lệ",
    "All orders have valid customer references": "Tất cả đơn hàng đều có tham chiếu khách hàng hợp lệ",
    "All order items have valid product references": "Tất cả mục đơn hàng đều có tham chiếu sản phẩm hợp lệ",
    "All payments have valid order references": "Tất cả thanh toán đều có tham chiếu đơn hàng hợp lệ",
    "All products have valid stock levels": "Tất cả sản phẩm đều có mức tồn kho hợp lệ",
    "All products have consistent available stock calculations": "Tất cả sản phẩm đều có tính toán tồn kho khả dụng nhất quán",
    "All users have valid outlet assignments": "Tất cả người dùng đều có phân công cửa hàng hợp lệ",
    "API Keys endpoint is working!": "API Keys endpoint đang hoạt động!",
    "Audit log retrieved successfully": "Đã lấy nhật ký kiểm toán thành công",
    "Audit logging appears to be working correctly": "Nhật ký kiểm toán có vẻ hoạt động đúng",
    "Availability checked successfully": "Đã kiểm tra tính khả dụng thành công",
    "AWS S3 test failed": "Kiểm tra AWS S3 thất bại",
    "Bank account not found": "Không tìm thấy tài khoản ngân hàng",
    "Billing configuration updated successfully": "Đã cập nhật cấu hình thanh toán thành công",
    "Business name already exists": "Tên doanh nghiệp đã tồn tại",
    "Cannot delete the default \"General\" category. This category was created during registration and must remain active.": "Không thể xóa danh mục mặc định \"Chung\". Danh mục này được tạo khi đăng ký và phải giữ hoạt động.",
    "Cannot delete the default outlet. This is the main outlet created during registration and must remain active.": "Không thể xóa cửa hàng mặc định. Đây là cửa hàng chính được tạo khi đăng ký và phải giữ hoạt động.",
    "Cannot delete the last administrator. Please assign another administrator first.": "Không thể xóa quản trị viên cuối cùng. Vui lòng chỉ định quản trị viên khác trước.",
    "You cannot delete your own account. Please contact another administrator.": "Bạn không thể xóa tài khoản của chính mình. Vui lòng liên hệ quản trị viên khác.",
    "Cannot detect entity type from data": "Không thể phát hiện loại thực thể từ dữ liệu",
    "Categories retrieved successfully": "Đã lấy danh mục thành công",
    "Category created successfully": "Đã tạo danh mục thành công",
    "Category deleted successfully": "Đã xóa danh mục thành công",
    "Category retrieved successfully": "Đã lấy danh mục thành công",
    "Category updated successfully": "Đã cập nhật danh mục thành công",
    "Failed to change password": "Không thể đổi mật khẩu",
    "Failed to check audit log completeness": "Không thể kiểm tra tính đầy đủ của nhật ký kiểm toán",
    "Failed to check data consistency": "Không thể kiểm tra tính nhất quán dữ liệu",
    "Failed to check order-customer integrity": "Không thể kiểm tra tính toàn vẹn đơn hàng-khách hàng",
    "Failed to check order-product integrity": "Không thể kiểm tra tính toàn vẹn đơn hàng-sản phẩm",
    "Failed to check for orphaned records": "Không thể kiểm tra bản ghi mồ côi",
    "Failed to check payment-order integrity": "Không thể kiểm tra tính toàn vẹn thanh toán-đơn hàng",
    "Failed to check product stock consistency": "Không thể kiểm tra tính nhất quán tồn kho sản phẩm",
    "Failed to check user-outlet integrity": "Không thể kiểm tra tính toàn vẹn người dùng-cửa hàng",
    "Cleanup operation failed": "Thao tác dọn dẹp thất bại",
    "Failed to create outlet": "Không thể tạo cửa hàng",
    "Currency is required": "Yêu cầu tiền tệ",
    "Currency updated successfully": "Đã cập nhật tiền tệ thành công",
    "Customer created successfully": "Đã tạo khách hàng thành công",
    "Customer deleted successfully": "Đã xóa khách hàng thành công",
    "Cannot delete customer with active orders. Please complete or cancel these orders first.": "Không thể xóa khách hàng có đơn hàng đang hoạt động. Vui lòng hoàn thành hoặc hủy các đơn hàng này trước.",
    "Customer retrieved successfully": "Đã lấy khách hàng thành công",
    "Customer updated successfully": "Đã cập nhật khách hàng thành công",
    "Enhanced dashboard data retrieved successfully": "Đã lấy dữ liệu bảng điều khiển nâng cao thành công",
    "All data integrity checks passed": "Tất cả kiểm tra tính toàn vẹn dữ liệu đã vượt qua",
    "Default outlet not found": "Không tìm thấy cửa hàng mặc định",
    "Failed to delete account": "Không thể xóa tài khoản",
    "Failed to delete category": "Không thể xóa danh mục",
    "Device registered successfully": "Đã đăng ký thiết bị thành công",
    "Device registration failed": "Đăng ký thiết bị thất bại",
    "Email verification failed": "Xác minh email thất bại",
    "Email verified successfully": "Đã xác minh email thành công",
    "Failed to fetch billing cycles": "Không thể lấy chu kỳ thanh toán",
    "Failed to fetch billing configuration": "Không thể lấy cấu hình thanh toán",
    "Failed to fetch category": "Không thể lấy danh mục",
    "Failed to fetch plan": "Không thể lấy gói",
    "Failed to fetch pricing configuration": "Không thể lấy cấu hình giá",
    "Failed to fetch system analytics": "Không thể lấy phân tích hệ thống",
    "Gateway error. The server is temporarily unavailable.": "Lỗi cổng. Máy chủ tạm thời không khả dụng.",
    "Growth metrics retrieved successfully": "Đã lấy chỉ số tăng trưởng thành công",
    "Image upload failed": "Tải ảnh lên thất bại",
    "Image validation failed": "Xác thực ảnh thất bại",
    "Invalid action specified": "Hành động không hợp lệ được chỉ định",
    "Invalid currency code. Supported currencies: USD, VND": "Mã tiền tệ không hợp lệ. Các loại tiền tệ được hỗ trợ: USD, VND",
    "Invalid date": "Ngày không hợp lệ",
    "Invalid date range provided": "Khoảng ngày được cung cấp không hợp lệ",
    "Invalid entity type specified": "Loại thực thể được chỉ định không hợp lệ",
    "Invalid features format": "Định dạng tính năng không hợp lệ",
    "Invalid ID format": "Định dạng ID không hợp lệ",
    "Invalid JSON format": "Định dạng JSON không hợp lệ",
    "Invalid JSON data": "Dữ liệu JSON không hợp lệ",
    "Invalid limits format": "Định dạng giới hạn không hợp lệ",
    "Invalid merchant ID": "ID thương hiệu không hợp lệ",
    "Invalid outlet ID": "ID cửa hàng không hợp lệ",
    "Invalid outlet stock data": "Dữ liệu tồn kho cửa hàng không hợp lệ",
    "Invalid query parameters": "Tham số truy vấn không hợp lệ",
    "Invalid rental dates": "Ngày thuê không hợp lệ",
    "Invalid request format": "Định dạng yêu cầu không hợp lệ",
    "Invalid session ID": "ID phiên không hợp lệ",
    "Invalid tenant key provided": "Khóa tenant được cung cấp không hợp lệ",
    "Invalid user ID": "ID người dùng không hợp lệ",
    "Invalid user role": "Vai trò người dùng không hợp lệ",
    "Login successful": "Đăng nhập thành công",
    "Logged out successfully": "Đã đăng xuất thành công",
    "Manual payment created successfully": "Đã tạo thanh toán thủ công thành công",
    "Merchant account created successfully. Please verify your email to activate your account": "Đã tạo tài khoản thương hiệu thành công. Vui lòng xác minh email để kích hoạt tài khoản",
    "Merchant account created successfully with default outlet and trial subscription": "Đã tạo tài khoản thương hiệu thành công với cửa hàng mặc định và đăng ký dùng thử",
    "Merchant created successfully with default outlet": "Đã tạo thương hiệu thành công với cửa hàng mặc định",
    "Merchant deleted successfully": "Đã xóa thương hiệu thành công",
    "Cannot delete merchant with active subscription. Please cancel the subscription first.": "Không thể xóa thương hiệu có đăng ký đang hoạt động. Vui lòng hủy đăng ký trước.",
    "Merchant account is inactive": "Tài khoản thương hiệu không hoạt động",
    "Merchant information updated successfully": "Đã cập nhật thông tin thương hiệu thành công",
    "Merchant registered successfully with 14-day free trial": "Đã đăng ký thương hiệu thành công với dùng thử miễn phí 14 ngày",
    "Merchant retrieved successfully": "Đã lấy thương hiệu thành công",
    "Merchant updated successfully": "Đã cập nhật thương hiệu thành công",
    "Missing endpoint or token in request": "Thiếu endpoint hoặc token trong yêu cầu",
    "Missing entities in request": "Thiếu thực thể trong yêu cầu",
    "Missing entity type in request": "Thiếu loại thực thể trong yêu cầu",
    "No file provided": "Không có tệp được cung cấp",
    "Merchant ID is required": "Yêu cầu ID thương hiệu",
    "Missing product data": "Thiếu dữ liệu sản phẩm",
    "Session ID is required": "Yêu cầu ID phiên",
    "Missing staging keys": "Thiếu khóa staging",
    "Mobile login successful": "Đăng nhập di động thành công",
    "Multiple entities found with same identifier": "Tìm thấy nhiều thực thể với cùng định danh",
    "Multiple entity types found in file": "Tìm thấy nhiều loại thực thể trong tệp",
    "No default bank account found": "Không tìm thấy tài khoản ngân hàng mặc định",
    "No default outlet found for merchant": "Không tìm thấy cửa hàng mặc định cho thương hiệu",
    "No entities to import": "Không có thực thể để nhập",
    "No fields to update": "Không có trường để cập nhật",
    "No image file provided": "Không có tệp ảnh được cung cấp",
    "No orphaned order items found": "Không tìm thấy mục đơn hàng mồ côi",
    "No valid fields to update": "Không có trường hợp lệ để cập nhật",
    "Order analytics retrieved successfully": "Đã lấy phân tích đơn hàng thành công",
    "Order created successfully": "Đã tạo đơn hàng thành công",
    "Order retrieved successfully": "Đã lấy đơn hàng thành công",
    "Order updated successfully": "Đã cập nhật đơn hàng thành công",
    "Outlets retrieved successfully": "Đã lấy cửa hàng thành công",
    "Outlet created successfully": "Đã tạo cửa hàng thành công",
    "Outlet deleted successfully": "Đã xóa cửa hàng thành công",
    "Outlet information updated successfully": "Đã cập nhật thông tin cửa hàng thành công",
    "Outlet ID is required": "Yêu cầu ID cửa hàng",
    "Outlet stock information is required": "Yêu cầu thông tin tồn kho cửa hàng",
    "Outlet updated successfully": "Đã cập nhật cửa hàng thành công",
    "Password changed successfully": "Đã đổi mật khẩu thành công",
    "Failed to hash password": "Không thể băm mật khẩu",
    "If an account with that email exists, a password reset link has been sent": "Nếu tài khoản với email đó tồn tại, liên kết đặt lại mật khẩu đã được gửi",
    "Password has been reset successfully": "Đã đặt lại mật khẩu thành công",
    "Failed to update password": "Không thể cập nhật mật khẩu",
    "Payload validation successful": "Xác thực payload thành công",
    "Payment method and transaction ID are required": "Yêu cầu phương thức thanh toán và ID giao dịch",
    "Phone number already exists": "Số điện thoại đã tồn tại",
    "Plan created successfully": "Đã tạo gói thành công",
    "Plan deleted successfully": "Đã xóa gói thành công",
    "Cannot delete plan with active subscriptions. Please wait for subscriptions to expire or cancel them first.": "Không thể xóa gói có đăng ký đang hoạt động. Vui lòng đợi đăng ký hết hạn hoặc hủy chúng trước.",
    "Plan limit addon not found": "Không tìm thấy phần bổ sung giới hạn gói",
    "A plan with this name already exists": "Gói với tên này đã tồn tại",
    "Plan retrieved successfully": "Đã lấy gói thành công",
    "Plan updated successfully": "Đã cập nhật gói thành công",
    "Preview operation completed successfully": "Thao tác xem trước hoàn tất thành công",
    "Pricing configuration updated successfully": "Đã cập nhật cấu hình giá thành công",
    "Products retrieved successfully": "Đã lấy sản phẩm thành công",
    "Access denied to this product": "Truy cập bị từ chối sản phẩm này",
    "Product availability retrieved successfully": "Đã lấy tính khả dụng sản phẩm thành công",
    "Product created successfully": "Đã tạo sản phẩm thành công",
    "Product deleted successfully": "Đã xóa sản phẩm thành công",
    "A product with this name already exists. Please choose a different name.": "Sản phẩm với tên này đã tồn tại. Vui lòng chọn tên khác.",
    "Product not found in specified outlet": "Không tìm thấy sản phẩm trong cửa hàng được chỉ định",
    "Product retrieved successfully": "Đã lấy sản phẩm thành công",
    "Product updated successfully": "Đã cập nhật sản phẩm thành công",
    "Profile updated successfully": "Đã cập nhật hồ sơ thành công",
    "Failed to generate QR code": "Không thể tạo mã QR",
    "Recent operations found without corresponding audit logs": "Tìm thấy thao tác gần đây không có nhật ký kiểm toán tương ứng",
    "Failed to retrieve users": "Không thể lấy người dùng",
    "Session cannot be resumed": "Không thể tiếp tục phiên",
    "Session cannot be rolled back": "Không thể hoàn tác phiên",
    "Session not found": "Không tìm thấy phiên",
    "Some users were not found": "Một số người dùng không được tìm thấy",
    "Subscription created successfully": "Đã tạo đăng ký thành công",
    "Subscription error": "Lỗi đăng ký",
    "Subscription paused successfully": "Đã tạm dừng đăng ký thành công",
    "Subscription renewed successfully": "Đã gia hạn đăng ký thành công",
    "Subscription status retrieved successfully": "Đã lấy trạng thái đăng ký thành công",
    "Sync check failed": "Kiểm tra đồng bộ thất bại",
    "Sync check completed": "Đã hoàn tất kiểm tra đồng bộ",
    "Sync operation completed successfully": "Thao tác đồng bộ hoàn tất thành công",
    "Sync data retrieved successfully": "Đã lấy dữ liệu đồng bộ thành công",
    "Sync operation failed": "Thao tác đồng bộ thất bại",
    "Sync operation partially failed": "Thao tác đồng bộ thất bại một phần",
    "Failed to resume sync operation": "Không thể tiếp tục thao tác đồng bộ",
    "Test API working": "API kiểm tra đang hoạt động",
    "Test POST working": "POST kiểm tra đang hoạt động",
    "Request timeout. Please try again.": "Hết thời gian yêu cầu. Vui lòng thử lại.",
    "Today metrics retrieved successfully": "Đã lấy chỉ số hôm nay thành công",
    "Token is required": "Yêu cầu token",
    "Token is valid": "Token hợp lệ",
    "Top products retrieved successfully": "Đã lấy sản phẩm hàng đầu thành công",
    "Failed to update category": "Không thể cập nhật danh mục",
    "Failed to update order": "Không thể cập nhật đơn hàng",
    "Failed to update outlet": "Không thể cập nhật cửa hàng",
    "Failed to update plan": "Không thể cập nhật gói",
    "Failed to update pricing configuration": "Không thể cập nhật cấu hình giá",
    "Failed to update user profile": "Không thể cập nhật hồ sơ người dùng",
    "Failed to upload image": "Không thể tải ảnh lên",
    "User account created successfully. Please verify your email to activate your account": "Đã tạo tài khoản người dùng thành công. Vui lòng xác minh email để kích hoạt tài khoản",
    "User account created successfully": "Đã tạo tài khoản người dùng thành công",
    "User created successfully": "Đã tạo người dùng thành công",
    "User deactivated successfully": "Đã vô hiệu hóa người dùng thành công",
    "User deleted successfully": "Đã xóa người dùng thành công",
    "User retrieved successfully": "Đã lấy người dùng thành công",
    "User updated successfully": "Đã cập nhật người dùng thành công",
    "Validation failed": "Xác thực thất bại",
}

# Read Vietnamese localization file
with open('POS ADBD/vi-VN.lproj/Localizable.strings', 'r', encoding='utf-8') as f:
    vi_content = f.read()

# Find error codes section
error_section_start = vi_content.find('// MARK: - Error Codes')
if error_section_start == -1:
    print("Error: Could not find error codes section")
    exit(1)

# Extract the part before error codes
before_errors = vi_content[:error_section_start]

# Extract error codes lines
error_lines = vi_content[error_section_start:].split('\n')
error_codes_section = []

for line in error_lines:
    if line.strip() == '' or line.strip().startswith('//'):
        error_codes_section.append(line)
        continue
    
    # Match pattern: "ERROR_CODE" = "English message";
    match = re.match(r'^"([A-Z_]+)"\s*=\s*"([^"]+)";', line)
    if match:
        error_code = match.group(1)
        english_msg = match.group(2)
        
        # Get translation
        if english_msg in translations:
            vietnamese_msg = translations[english_msg]
            error_codes_section.append(f'"{error_code}" = "{vietnamese_msg}";')
        else:
            # If no translation found, keep English but add comment
            error_codes_section.append(f'"{error_code}" = "{english_msg}"; // TODO: Translate to Vietnamese')
            print(f"Warning: No translation for: {error_code} = {english_msg}")
    else:
        error_codes_section.append(line)

# Reconstruct file
new_content = before_errors + '\n'.join(error_codes_section)

# Write back
with open('POS ADBD/vi-VN.lproj/Localizable.strings', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✓ Successfully translated error codes to Vietnamese!")
