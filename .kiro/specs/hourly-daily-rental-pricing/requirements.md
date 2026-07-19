# Requirements Document

## Introduction

Tính năng cho thuê sản phẩm theo ngày (DAILY) hoặc giá cố định (FIXED) cho hệ thống POS AnyRent. Merchant cấu hình từng sản phẩm với pricing type, và hệ thống tự động tính tiền dựa trên số ngày thuê × đơn giá. Scope: chỉ hỗ trợ FIXED và DAILY (bỏ HOURLY cho phase sau nếu cần).

## Glossary

- **Pricing_Type**: Loại tính giá: FIXED (giá cố định/lần thuê) hoặc DAILY (giá × số ngày)
- **Product_Card**: Giao diện hiển thị thông tin sản phẩm (danh sách, chi tiết)
- **Order_Creation_Flow**: Quy trình tạo đơn hàng trên iOS mobile app
- **Duration_Input**: Component nhập số ngày thuê khi tạo order cho DAILY product
- **Rental_Duration**: Số ngày thuê thực tế, tính từ ngày pickup đến ngày return
- **Unit_Price**: Giá thuê/ngày (field `rentPrice` trên Product)

## Requirements

### Requirement 1: Product Pricing Type (FIXED hoặc DAILY)

**User Story:** As a merchant, I want to set each product as fixed-price or daily-price rental, so customers are charged appropriately.

#### Acceptance Criteria

1. WHEN creating/editing a product, THE system SHALL allow selecting pricing type: FIXED hoặc DAILY
2. WHEN pricing type is DAILY, THE system SHALL store rentPrice as giá/ngày
3. WHEN pricing type is FIXED or null, THE system SHALL treat rentPrice as giá trọn gói (không phụ thuộc thời gian)
4. THE system SHALL preserve existing orders unchanged khi merchant thay đổi pricing type

### Requirement 2: Price Calculation

**User Story:** As a staff member, I want the system to auto-calculate rental total based on days × price, so I don't have to calculate manually.

#### Acceptance Criteria

1. WHEN product is DAILY, THE system SHALL calculate: totalPrice = quantity × rentPrice × số_ngày
2. WHEN product is FIXED, THE system SHALL calculate: totalPrice = quantity × rentPrice
3. WHEN pickup and return dates are selected, THE system SHALL auto-calculate số_ngày = (returnDate - pickupDate) in days (minimum 1)
4. THE system SHALL allow manual override of số_ngày (staff nhập trực tiếp)

### Requirement 3: UI — Chọn thời lượng khi tạo Order (iOS)

**User Story:** As a staff member, I want to see and input rental duration when creating an order for a daily-priced product.

#### Acceptance Criteria

1. WHEN adding a DAILY product to cart, THE app SHALL show Duration_Input (số ngày) với default = 1
2. WHEN staff changes số ngày, THE app SHALL recalculate và hiển thị totalPrice real-time
3. WHEN product is FIXED, THE app SHALL ẩn Duration_Input
4. WHEN pickup/return dates đã chọn, THE app SHALL auto-fill số ngày từ date range
5. THE Duration_Input SHALL constrain minimum = 1 ngày

### Requirement 4: UI — Hiển thị giá trên Product Card và Order

**User Story:** As a staff member, I want to clearly see whether a product is priced per-day or fixed, so I can inform customers accurately.

#### Acceptance Criteria

1. WHEN product is DAILY, THE Product_Card SHALL show rentPrice kèm label "/ngày"
2. WHEN product is FIXED, THE Product_Card SHALL show rentPrice kèm label "/lần" hoặc không suffix
3. WHEN displaying order item for DAILY product, THE app SHALL show: "X ngày × đơn_giá = tổng"
4. WHEN displaying order item for FIXED product, THE app SHALL show: "quantity × đơn_giá = tổng"

### Requirement 5: Order Storage

**User Story:** As a system admin, I want orders to store duration info for audit and reporting.

#### Acceptance Criteria

1. WHEN creating RENT order for DAILY product, THE system SHALL store rentalDuration (số ngày) on Order
2. WHEN creating RENT order for DAILY product, THE system SHALL store rentalDurationUnit = "day" on Order
3. THE system SHALL store rentalDays on OrderItem = số ngày thuê cho item đó
4. WHEN order has mix FIXED + DAILY products, THE system SHALL calculate each item independently

### Requirement 6: API — Backward Compatible

**User Story:** As a developer, I want the API to support daily pricing without breaking existing mobile app behavior.

#### Acceptance Criteria

1. THE API SHALL return pricingType in product responses (null/FIXED = fixed, DAILY = per-day)
2. THE API SHALL accept rentalDuration and rentalDurationUnit in order creation request
3. WHEN mobile sends order for DAILY product WITHOUT duration, THE API SHALL default rentalDuration = 1
4. THE API SHALL trust frontend-calculated unitPrice and totalPrice (giữ behavior hiện tại — server không override price)
