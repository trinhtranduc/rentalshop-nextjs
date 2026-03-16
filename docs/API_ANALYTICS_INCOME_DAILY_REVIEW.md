# Đánh giá API Daily Income – Response & List Order

**Route:** `GET /api/analytics/income/daily`  
**File:** `apps/api/app/api/analytics/income/daily/route.ts`

---

## 1. Cấu trúc response – Đã chuẩn

```json
{
  "success": true,
  "code": "DAILY_INCOME_SUCCESS",
  "message": "DAILY_INCOME_SUCCESS",
  "data": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "days": [ ... ],
    "summary": { ... }
  }
}
```

- **startDate / endDate:** Đúng với query, format YYYY-MM-DD.
- **days:** Mảng theo ngày, đã sort tăng dần theo ngày.
- **summary:** Tổng hợp toàn kỳ, đủ cho báo cáo và KPI.

---

## 2. `data.days[]` – Từng ngày

| Trường | Chuẩn? | Ghi chú |
|--------|--------|--------|
| **date** | ✅ | YYYY/MM/DD, dùng nhóm và sort. |
| **dateISO** | ✅ | Midnight UTC, cho format theo timezone. |
| **totalRevenue** | ✅ | Tổng doanh thu trong ngày (đã thu + đã hoàn). |
| **depositRefund** | ✅ | Tiền thế chân thu trong ngày (RESERVED/PICKUPED). |
| **totalCollateral** | ✅ | Tiền thế chân đang giữ (đơn PICKUPED trong ngày). |
| **totalCollateralPlan** | ✅ | Tiền thế chân dự kiến trả (đơn có pickupPlanAt trong ngày). |
| **newOrderCount** | ✅ | Số đơn tạo trong ngày. |
| **pickupOrderCount** | ✅ | Số đơn lấy trong ngày. |
| **returnOrderCount** | ✅ | Số đơn trả trong ngày. |
| **cancelledOrderCount** | ✅ | Số đơn hủy trong ngày. |
| **orders** | ✅ | Danh sách đơn/event doanh thu trong ngày. |

---

## 3. `data.days[].orders[]` – Từng dòng order/event

| Trường | Chuẩn? | Ghi chú |
|--------|--------|--------|
| **id** | ✅ | Order id (số). |
| **orderNumber** | ✅ | Mã đơn (string). |
| **orderType** | ✅ | RENT \| SALE. |
| **status** | ✅ | RESERVED \| PICKUPED \| RETURNED \| COMPLETED \| CANCELLED. |
| **revenue** | ✅ | Doanh thu của event (có thể âm khi hoàn cọc). |
| **revenueType** | ✅ | RENT_DEPOSIT \| RENT_PICKUP \| RENT_RETURN \| SALE \| MULTIPLE \| EXPECTED_PICKUP \| EXPECTED_RETURN. |
| **description** | ✅ | Mô tả event (hoặc gộp khi MULTIPLE). |
| **revenueDate** | ✅ | ISO timestamp của event. |
| **customerName** | ✅ | Họ tên (ghép firstName + lastName). |
| **customerPhone** | ✅ | SĐT. |
| **outletName** | ✅ | Tên outlet. |
| **outletId** | ✅ | ID outlet (số) – cho mobile deep link. |
| **customerId** | ✅ | ID khách (số, có thể null) – cho mobile deep link. |
| **createdAt** | ✅ | ISO string ngày tạo đơn – cho mobile hiển thị. |
| **pickupPlanAt** | ✅ | ISO string hoặc null – lịch lấy hàng. |
| **returnPlanAt** | ✅ | ISO string hoặc null – lịch trả hàng. |
| **totalAmount** | ✅ | Tổng đơn. |
| **depositAmount** | ✅ | Tiền cọc. |
| **securityDeposit** | ✅ | Tiền thế chân. |
| **damageFee** | ✅ | Phí hư hỏng. |

**Mobile:** Response đã bổ sung `outletId`, `customerId`, `createdAt`, `pickupPlanAt`, `returnPlanAt` để app mobile deep link (outlet/order/customer) và hiển thị ngày không cần gọi thêm API.

**Phạm vi outlet (compatible):** Không có outletId trong scope (ADMIN, MERCHANT) → trả về dữ liệu **tất cả outlet** trong phạm vi (ADMIN = toàn hệ thống, MERCHANT = tất cả outlet của merchant). Có outletId (OUTLET_*) → chỉ outlet đó.

**Query param plan:** `plan=true` → thêm đơn **dự kiến lấy** (RESERVED, pickupPlanAt trong kỳ) và **dự kiến trả** (PICKUPED, returnPlanAt trong kỳ), revenue=0, revenueType lần lượt EXPECTED_PICKUP, EXPECTED_RETURN.

---

## 4. `data.summary` – Tổng hợp

| Trường | Chuẩn? | Ghi chú |
|--------|--------|--------|
| **totalDays** | ✅ | Số ngày trong kỳ. |
| **orderCounts.new / pickup / return / cancelled** | ✅ | Tổng đơn theo loại. |
| **totalRevenue** | ✅ | Tổng tiền thu trong kỳ. |
| **totalActualRevenue** | ✅ | Doanh thu thực tế (trừ tiền thế chân thu được). |
| **totalCollateral** | ✅ | Tiền thế chân đang giữ. |
| **totalCollateralPlanExpectedToRefund** | ✅ | Tiền chuẩn bị trả lại khách. |
| **totalRevenuePlan** | ✅ | Doanh thu dự kiến (RESERVED sắp lấy − thế chân PICKUPED sắp trả). |
| **totalDepositRefund** | ✅ | Dùng nội bộ cho totalActualRevenue. |
| **totalCollateralPlan** | ✅ | Alias của totalCollateralPlanExpectedToRefund. |
| **totalNewOrders** | ✅ | Tổng đơn mới. |
| **totalOrders** | ✅ | Tổng số dòng trong days[].orders. |

---

## 5. Khuyến nghị (Recommend)

### Đã làm
- **outletName trong list order:** Query đã có `outlet`, map đúng `outletName` cho mọi order (không còn undefined).
- **Response cho mobile:** Mỗi order có `outletId`, `customerId`, `createdAt`, `pickupPlanAt`, `returnPlanAt` (ISO) để deep link và hiển thị.

### Có thể bổ sung sau (optional)
- **timezone:** Trong response hoặc docs ghi rõ: “Tất cả ngày dùng UTC” (hoặc timezone cụ thể).
- **revenueType enum:** RENT_DEPOSIT, RENT_PICKUP, RENT_RETURN, SALE, SALE_CANCELLED, RENT_CANCELLED, MULTIPLE, EXPECTED_PICKUP, EXPECTED_RETURN.
- **Giới hạn:** Document `take: 10000` cho orders; nếu cần có thể thêm limit/offset theo ngày hoặc pagination.

### Không bắt buộc
- **totalDepositRefund / totalCollateralPlan** trong summary: giữ để tương thích; UI có thể ẩn nếu “không cần”.

---

## 6. Kết luận

- **Response:** Cấu trúc rõ, đủ cho báo cáo daily income và KPI rental (revenue, collateral, plan).
- **List order:** Đủ field để hiển thị và phân tích; **outletName** đã được sửa để luôn có giá trị khi có outlet.
- **Recommend:** API đã chuẩn cho mục đích hiện tại; các mục “có thể bổ sung sau” chỉ là cải tiến UX/documentation, không bắt buộc.
