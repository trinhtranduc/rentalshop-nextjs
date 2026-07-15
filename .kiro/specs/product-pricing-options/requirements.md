# Requirements Document

## Introduction

Cho phép **một sản phẩm cấu hình nhiều tùy chọn giá thuê (Pricing Options) cùng lúc** — giai đoạn này là **theo lần (FIXED)** và **theo ngày (DAILY)** — và nhân viên **chọn option khi thêm sản phẩm vào giỏ hàng**. Duration (số ngày) tính tự động từ pickup → return. Thiết kế phải mở rộng được sang các loại option tương lai (BLOCK theo ngày, HOURLY theo giờ) **mà không đổi schema**.

Đây là thay đổi **full-stack**: database dùng chung → chạm DB + API + web + mobile.

Kế thừa hạ tầng FIXED/DAILY đã có ([hourly-daily-rental-pricing](../hourly-daily-rental-pricing/requirements.md)): `pricingType`, `rentPrice`, `rentalDuration`, `rentalDays`, `PricingResolver`.

## Glossary

- **Pricing_Option**: Một cấu hình giá của sản phẩm: `type` (FIXED | DAILY | …), `price`, và (tương lai) `unit`/`blockSize`. Một sản phẩm có 1..N option.
- **Default_Option**: Option được đánh dấu `isDefault`, dùng khi cart chưa chọn.
- **Cart_Pricing_Selection**: Option mà nhân viên chọn cho một dòng giỏ hàng.
- **Rental_Duration**: Số ngày thuê tính từ pickup → return (tối thiểu 1).
- **Option_Snapshot**: Bản sao thông tin option (type, price, …) lưu trên OrderItem để order bất biến.

## Requirements

### Requirement 1: Cấu hình nhiều Pricing Option trên sản phẩm

**User Story:** As a merchant, I want to configure multiple rental pricing options on one product (per-rental and per-day), so staff can pick the right one at checkout.

#### Acceptance Criteria

1. WHEN tạo/sửa product, THE system SHALL cho phép thêm/xóa nhiều Pricing_Option, mỗi option gồm `type` (FIXED | DAILY) và `price` (> 0).
2. THE system SHALL cho phép đánh dấu đúng một option là `Default_Option`.
3. WHEN không có option nào được đánh dấu default, THE system SHALL tự chọn option đầu tiên làm default.
4. THE system SHALL cho phép mỗi `type` xuất hiện nhiều nhất một lần trên một sản phẩm (giai đoạn này).
5. THE system SHALL validate `price > 0` cho mỗi option; nếu không hợp lệ SHALL trả lỗi.

### Requirement 2: Backward compatibility với sản phẩm cũ

**User Story:** As a developer, I want existing single-price products to keep working.

#### Acceptance Criteria

1. WHEN sản phẩm không có Pricing_Option nào, THE system SHALL suy ra một option từ `pricingType`/`rentPrice` hiện có (FIXED nếu null).
2. THE system SHALL giữ nguyên `rentPrice`/`pricingType` trên Product (không xóa cột) để client cũ tiếp tục hoạt động.
3. WHEN merchant lưu sản phẩm cũ lần đầu qua form mới, THE system SHALL tạo Pricing_Option tương ứng mà không thay đổi giá.

### Requirement 3: Tính giá theo option

**User Story:** As a staff member, I want totals auto-calculated based on the selected option and rental duration.

#### Acceptance Criteria

1. WHEN option là FIXED, THE system SHALL tính `totalPrice = quantity × price`.
2. WHEN option là DAILY, THE system SHALL tính `totalPrice = quantity × price × Rental_Duration`.
3. WHEN pickup/return đã chọn, THE system SHALL tự tính `Rental_Duration = ceil(returnDate - pickupDate)` theo ngày, tối thiểu 1.
4. THE system SHALL cho phép nhân viên chỉnh tay số ngày (override) cho option DAILY.
5. THE logic tính giá SHALL không hardcode "day", để mở rộng BLOCK/HOURLY sau này.

### Requirement 4: UI — Chọn option khi thêm vào giỏ hàng (web + iOS)

**User Story:** As a staff member, I want to choose a pricing option per cart line and see the total update.

#### Acceptance Criteria

1. WHEN thêm sản phẩm nhiều-option vào cart, THE app SHALL cho chọn option (dropdown/segmented); mặc định = `Default_Option`.
2. WHEN sản phẩm chỉ có 1 option, THE app SHALL tự dùng option đó, không bắt chọn.
3. WHEN đổi option hoặc số ngày, THE app SHALL tính lại tổng dòng đó real-time.
4. WHEN option là DAILY, THE app SHALL hiển thị ô số ngày (với nút chỉnh); FIXED thì ẩn.
5. THE Product_Card SHALL hiển thị nhãn giá theo `Default_Option` (VD "200k / lần", "60k / ngày").

### Requirement 5: Lưu trữ Order (Option Snapshot)

**User Story:** As a system admin, I want orders to record which option was chosen, for audit/reporting and immutability.

#### Acceptance Criteria

1. WHEN tạo order, THE system SHALL lưu Option_Snapshot trên mỗi OrderItem: `pricingType`, `unitPrice`, `rentalDays`, `totalPrice`.
2. THE system SHALL giữ order bất biến khi merchant sửa/xóa option sau đó.
3. WHEN order có mix nhiều loại dòng (FIXED + DAILY), THE system SHALL tính từng dòng độc lập.

### Requirement 6: API — Backward Compatible

**User Story:** As a developer, I want the API to expose pricing options without breaking existing clients.

#### Acceptance Criteria

1. THE API SHALL trả `pricingOptions[]` trong product responses, đồng thời giữ `pricingType`/`rentPrice` cũ.
2. THE API SHALL nhận `pricingOptions[]` khi tạo/sửa product.
3. THE API SHALL nhận trên mỗi order item thông tin option đã chọn (`pricingOptionId` hoặc snapshot `pricingType`/`unitPrice`).
4. WHEN client cũ không gửi thông tin option, THE API SHALL xử lý như FIXED/DAILY hiện tại.

### Requirement 7: Khả năng mở rộng (tương lai)

**User Story:** As a product owner, I want to add BLOCK (per N days) and HOURLY options later without schema migration.

#### Acceptance Criteria

1. THE model SHALL để sẵn field cho `unit`/`blockSize` (nullable) dùng cho BLOCK/HOURLY.
2. Giai đoạn này THE system SHALL chỉ cho phép `type ∈ {FIXED, DAILY}` (chặn ở validation).
3. THE tính toán duration SHALL dùng hàm chung (`calculateDurationInUnit`) theo đơn vị của option.
