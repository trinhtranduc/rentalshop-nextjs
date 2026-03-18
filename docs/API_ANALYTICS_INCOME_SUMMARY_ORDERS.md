# API Analytics Income: Summary & Orders — Request & Response

## 1. GET /api/analytics/income/summary

Tổng hợp doanh thu theo kỳ (startDate–endDate) và breakdown theo từng ngày. **Không** trả danh sách đơn hàng.

### Request

- **Method:** `GET`
- **Path:** `/api/analytics/income/summary`
- **Headers:** `Authorization: Bearer <token>` (bắt buộc)
- **Query params:**

| Param     | Bắt buộc | Mô tả        |
| --------- | -------- | ------------ |
| startDate | Có       | YYYY-MM-DD   |
| endDate   | Có       | YYYY-MM-DD   |

**Ví dụ:**
```http
GET /api/analytics/income/summary?startDate=2026-03-01&endDate=2026-03-15
Authorization: Bearer <token>
```

### Response (200)

```json
{
  "success": true,
  "code": "INCOME_SUMMARY_SUCCESS",
  "message": "INCOME_SUMMARY_SUCCESS",
  "data": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-15",
    "summary": {
      "totalDays": 3,
      "orderCounts": {
        "new": 5,
        "pickup": 3,
        "return": 2,
        "cancelled": 0
      },
      "totalRevenue": 4200000,
      "totalActualRevenue": 3600000,
      "totalCollateral": 600000,
      "totalCollateralPlanExpectedToRefund": 400000,
      "totalCollateralPlan": 400000,
      "totalRevenuePlan": 1200000,
      "totalDepositRefund": 600000
    },
    "periods": [
      {
        "date": "2026/03/01",
        "dateISO": "2026-03-01T00:00:00.000Z",
        "totalRevenue": 1500000,
        "depositRefund": 200000,
        "totalCollateral": 300000,
        "totalCollateralPlan": 200000,
        "newOrderCount": 2,
        "pickupOrderCount": 1,
        "returnOrderCount": 0,
        "cancelledOrderCount": 0
      },
      {
        "date": "2026/03/02",
        "dateISO": "2026-03-02T00:00:00.000Z",
        "totalRevenue": 1200000,
        "depositRefund": 200000,
        "totalCollateral": 200000,
        "totalCollateralPlan": 100000,
        "newOrderCount": 2,
        "pickupOrderCount": 1,
        "returnOrderCount": 1,
        "cancelledOrderCount": 0
      },
      {
        "date": "2026/03/03",
        "dateISO": "2026-03-03T00:00:00.000Z",
        "totalRevenue": 1500000,
        "depositRefund": 200000,
        "totalCollateral": 100000,
        "totalCollateralPlan": 100000,
        "newOrderCount": 1,
        "pickupOrderCount": 1,
        "returnOrderCount": 1,
        "cancelledOrderCount": 0
      }
    ]
  }
}
```

**Giải thích summary:**
- `totalRevenue`: Tổng tiền thu trong kỳ (đã thu + đã hoàn).
- `totalActualRevenue`: Doanh thu thực tế = totalRevenue − totalDepositRefund.
- `totalCollateral`: Tổng tiền thế chân đang giữ (đơn đã PICKUPED).
- `totalCollateralPlanExpectedToRefund` / `totalCollateralPlan`: **Tiền thế chân dự kiến trả** — Tổng số tiền cọc (thế chân) bạn sẽ trả lại cho khách khi họ trả hàng. Chỉ tính các đơn thuê **đang cho mượn** (khách đã lấy hàng) có **lịch trả hàng** rơi vào kỳ báo cáo. Dùng để biết cần chuẩn bị bao nhiêu tiền để hoàn cọc trong kỳ.
- `totalRevenuePlan`: Doanh thu dự kiến (RESERVED sắp lấy − thế chân PICKUPED sắp trả).
- `totalDepositRefund`: Tổng tiền thế chân thu trong kỳ (dùng nội bộ cho totalActualRevenue).

**Mỗi phần tử trong `periods`:**
- `date`: Ngày dạng YYYY/MM/DD.
- `dateISO`: Ngày midnight UTC (ISO string).
- Các trường số: totalRevenue, depositRefund, totalCollateral, totalCollateralPlan, newOrderCount, pickupOrderCount, returnOrderCount, cancelledOrderCount.

---

## 2. GET /api/analytics/income/orders

Danh sách đơn hàng trong kỳ, có lọc theo status, plan và phân trang.

### Request

- **Method:** `GET`
- **Path:** `/api/analytics/income/orders`
- **Headers:** `Authorization: Bearer <token>` (bắt buộc)
- **Query params:**

| Param     | Bắt buộc | Mặc định | Mô tả |
| --------- | -------- | -------- | ----- |
| startDate | Có       | —        | YYYY-MM-DD |
| endDate   | Có       | —        | YYYY-MM-DD |
| status    | Không    | `all`    | `new` \| `pickup` \| `return` \| `all` |
| plan      | Không    | `true`   | `true`: thêm đơn dự kiến lấy/trả (revenue=0); `false`: chỉ đơn thực tế |
| limit     | Không    | —        | Số đơn tối đa (dùng với offset để phân trang) |
| offset    | Không    | `0`      | Vị trí bắt đầu (dùng cùng limit) |

**Ví dụ:**
```http
GET /api/analytics/income/orders?startDate=2026-03-01&endDate=2026-03-15&status=all&plan=true
GET /api/analytics/income/orders?startDate=2026-03-01&endDate=2026-03-15&status=pickup&plan=false&limit=20&offset=0
Authorization: Bearer <token>
```

### Response (200) — không phân trang

Khi **không** gửi `limit`:

```json
{
  "success": true,
  "code": "INCOME_ORDERS_SUCCESS",
  "message": "INCOME_ORDERS_SUCCESS",
  "data": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-15",
    "days": [
      {
        "date": "2026/03/01",
        "dateISO": "2026-03-01T00:00:00.000Z",
        "orders": [
          {
            "id": 101,
            "orderNumber": "ORD-001-0001",
            "orderType": "RENT",
            "status": "PICKUPED",
            "revenue": 600000,
            "revenueType": "RENT_PICKUP",
            "description": "Thu tiền khi lấy hàng",
            "revenueDate": "2026-03-01T08:00:00.000Z",
            "customerId": 5,
            "customerName": "Nguyễn Văn A",
            "customerPhone": "0901234567",
            "outletId": 1,
            "outletName": "Chi nhánh 1",
            "createdAt": "2026-02-28T10:00:00.000Z",
            "pickupPlanAt": "2026-03-01T08:00:00.000Z",
            "returnPlanAt": "2026-03-05T18:00:00.000Z",
            "totalAmount": 500000,
            "depositAmount": 100000,
            "securityDeposit": 200000,
            "damageFee": 0
          },
          {
            "id": 102,
            "orderNumber": "ORD-001-0002",
            "orderType": "RENT",
            "status": "RESERVED",
            "revenue": 0,
            "revenueType": "EXPECTED_PICKUP",
            "description": "Expected pickup (not yet picked up)",
            "revenueDate": "2026-03-01T14:00:00.000Z",
            "customerId": 6,
            "customerName": "Trần Thị B",
            "customerPhone": "0912345678",
            "outletId": 1,
            "outletName": "Chi nhánh 1",
            "createdAt": "2026-02-28T09:00:00.000Z",
            "pickupPlanAt": "2026-03-01T14:00:00.000Z",
            "returnPlanAt": "2026-03-04T18:00:00.000Z",
            "totalAmount": 300000,
            "depositAmount": 50000,
            "securityDeposit": 100000,
            "damageFee": 0
          }
        ]
      },
      {
        "date": "2026/03/02",
        "dateISO": "2026-03-02T00:00:00.000Z",
        "orders": [
          {
            "id": 103,
            "orderNumber": "ORD-001-0003",
            "orderType": "RENT",
            "status": "PICKUPED",
            "revenue": 0,
            "revenueType": "EXPECTED_RETURN",
            "description": "Expected return (not yet returned)",
            "revenueDate": "2026-03-02T17:00:00.000Z",
            "customerId": 7,
            "customerName": "Lê Văn C",
            "customerPhone": "0923456789",
            "outletId": 1,
            "outletName": "Chi nhánh 1",
            "createdAt": "2026-02-27T08:00:00.000Z",
            "pickupPlanAt": "2026-02-28T08:00:00.000Z",
            "returnPlanAt": "2026-03-02T17:00:00.000Z",
            "totalAmount": 400000,
            "depositAmount": 80000,
            "securityDeposit": 150000,
            "damageFee": 0
          }
        ]
      }
    ]
  }
}
```

### Response (200) — có phân trang

Khi gửi `limit` (và tùy chọn `offset`), thêm `pagination`. Mỗi ngày chỉ chứa các đơn thuộc trang hiện tại.

```json
{
  "success": true,
  "code": "INCOME_ORDERS_SUCCESS",
  "message": "INCOME_ORDERS_SUCCESS",
  "data": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-15",
    "days": [
      {
        "date": "2026/03/01",
        "dateISO": "2026-03-01T00:00:00.000Z",
        "orders": [
          {
            "id": 101,
            "orderNumber": "ORD-001-0001",
            "orderType": "RENT",
            "status": "PICKUPED",
            "revenue": 600000,
            "revenueType": "RENT_PICKUP",
            "description": "Thu tiền khi lấy hàng",
            "revenueDate": "2026-03-01T08:00:00.000Z",
            "customerId": 5,
            "customerName": "Nguyễn Văn A",
            "customerPhone": "0901234567",
            "outletId": 1,
            "outletName": "Chi nhánh 1",
            "createdAt": "2026-02-28T10:00:00.000Z",
            "pickupPlanAt": "2026-03-01T08:00:00.000Z",
            "returnPlanAt": "2026-03-05T18:00:00.000Z",
            "totalAmount": 500000,
            "depositAmount": 100000,
            "securityDeposit": 200000,
            "damageFee": 0
          }
        ]
      },
      {
        "date": "2026/03/02",
        "dateISO": "2026-03-02T00:00:00.000Z",
        "orders": [
          {
            "id": 102,
            "orderNumber": "ORD-001-0002",
            "orderType": "SALE",
            "status": "COMPLETED",
            "revenue": 250000,
            "revenueType": "SALE",
            "description": "Đơn bán được tạo",
            "revenueDate": "2026-03-02T09:30:00.000Z",
            "customerId": 8,
            "customerName": "Phạm Văn D",
            "customerPhone": "0934567890",
            "outletId": 1,
            "outletName": "Chi nhánh 1",
            "createdAt": "2026-03-02T09:30:00.000Z",
            "pickupPlanAt": null,
            "returnPlanAt": null,
            "totalAmount": 250000,
            "depositAmount": 0,
            "securityDeposit": 0,
            "damageFee": 0
          }
        ]
      }
    ],
    "pagination": {
      "total": 85,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Order item (mỗi phần tử trong `days[].orders`):**
- `id`, `orderNumber`, `orderType`, `status`: thông tin đơn.
- `revenue`, `revenueType`, `description`, `revenueDate`: doanh thu từng sự kiện (hoặc 0 với EXPECTED_PICKUP / EXPECTED_RETURN khi plan=true).
- `customerId`, `customerName`, `customerPhone`: khách hàng.
- `outletId`, `outletName`: cửa hàng.
- Ngày tạo đơn, lịch lấy hàng, lịch trả hàng: chuỗi ngày-giờ, dùng cho mobile/deep link.
- `totalAmount`, `depositAmount`, `securityDeposit`, `damageFee`: số tiền.

**revenueType có thể là:**  
`RENT_DEPOSIT`, `RENT_PICKUP`, `RENT_RETURN`, `SALE`, `MULTIPLE`, `EXPECTED_PICKUP`, `EXPECTED_RETURN`, v.v.

---

## Giải thích cho người dùng — Các trường trong báo cáo doanh thu

Phần này giúp bạn hiểu **ý nghĩa từng con số** trong báo cáo doanh thu (API income/summary, income/orders, income/daily). Dùng khi đọc màn hình tổng hợp hoặc danh sách đơn theo ngày.

---

### Kết quả trả về (cấu trúc chung)

| Trường | Ý nghĩa |
| ------ | ------- |
| **success** | `true` = gọi API thành công; `false` = có lỗi (xem code/message). |
| **code** | Mã trạng thái, ví dụ: `INCOME_SUMMARY_SUCCESS`, `INCOME_ORDERS_SUCCESS`, `DAILY_INCOME_SUCCESS`. Dùng khi báo lỗi hoặc log. |
| **message** | Thông báo trạng thái (thường trùng với code). |
| **data** | Toàn bộ dữ liệu báo cáo: kỳ báo cáo, tổng hợp cả kỳ, và chi tiết từng ngày (có thể kèm danh sách đơn). |

**Trong data thường có:**

| Trường | Có trong API | Ý nghĩa |
| ------ | ------------ | ------- |
| **startDate** | summary, orders, daily | Ngày bắt đầu kỳ (YYYY-MM-DD), đúng với khoảng bạn chọn. |
| **endDate** | summary, orders, daily | Ngày kết thúc kỳ (YYYY-MM-DD). |
| **summary** | summary, daily | Các chỉ số **tổng** của cả kỳ (số đơn, doanh thu, tiền cọc…). API orders không trả summary. |
| **periods** | summary | Số liệu **từng ngày** trong kỳ, **không** kèm danh sách đơn — dùng khi chỉ cần xem biểu đồ/ bảng tổng theo ngày. |
| **days** | orders, daily | Số liệu **từng ngày** và **có** danh sách đơn trong mỗi ngày — dùng khi cần xem chi tiết từng đơn. |
| **pagination** | orders (khi có limit) | Thông tin phân trang: tổng số dòng, trang hiện tại, còn trang tiếp hay không. |

---

### Tổng hợp cả kỳ (summary) — Ý nghĩa chi tiết

#### Số ngày và tổng đơn theo loại

**Tổng đơn** trong báo cáo được tách thành bốn loại, theo **thời điểm** diễn ra trong kỳ: ngày tạo đơn, ngày lấy hàng, ngày trả hàng, thời điểm hủy. Mỗi đơn chỉ được đếm vào **một** trong bốn loại tùy sự kiện; không cộng trùng.

| Trường | Bạn hiểu là | Chi tiết / Ví dụ |
| -------------------- | ----------- | ----------------- |
| **totalDays** | Số ngày có ít nhất một giao dịch trong kỳ. | Chỉ tính những ngày có thu/hoàn tiền hoặc có đơn tạo/lấy/trả/hủy. Ví dụ: kỳ 01/03–15/03 nhưng chỉ 5 ngày có giao dịch → totalDays = 5. |
| **orderCounts.new** | Số **đơn mới** (khách đặt trong kỳ). | Đếm theo ngày **tạo đơn** nằm trong kỳ. **Không** tính đơn vừa tạo xong đã hủy trong cùng thời điểm. Mỗi đơn chỉ đếm một lần. |
| **orderCounts.pickup** | Số **đơn khách đã lấy hàng** trong kỳ. | Đếm theo ngày **lấy hàng** nằm trong kỳ. Mỗi đơn chỉ đếm một lần. |
| **orderCounts.return** | Số **đơn khách đã trả hàng** trong kỳ. | Đếm theo ngày **trả hàng** nằm trong kỳ. Mỗi đơn chỉ đếm một lần. |
| **orderCounts.cancelled** | Số **đơn bị hủy** trong kỳ. | Đếm theo **thời điểm hủy đơn** nằm trong kỳ. Gồm cả đơn thuê và đơn bán. |

**Lưu ý:** Một đơn có thể vừa là “đơn mới” (tạo trong kỳ) vừa “lấy hàng” trong kỳ — nhưng trong **orderCounts** mỗi loại (new, pickup, return, cancelled) đếm độc lập, không cộng chung một đơn nhiều lần cho cùng một loại.

#### Tiền thu và doanh thu

| Trường | Bạn hiểu là | Chi tiết / Ví dụ |
| -------------------- | ----------- | ----------------- |
| **totalRevenue** | **Tổng tiền thu vào** trong kỳ (sau khi trừ các khoản đã hoàn). | Gồm: tiền cọc đặt đơn, tiền thuê khi lấy hàng, tiền bán, phí hư hỏng thu thêm… **Trừ đi:** tiền hoàn khi hủy đơn, tiền trả cọc khi khách trả hàng. **Có thể âm** nếu trong kỳ hoàn nhiều hơn thu (ví dụ nhiều đơn hủy hoặc trả hàng hoàn cọc). |
| **totalActualRevenue** | **Doanh thu thực tế** — phần coi là “doanh thu”, không tính tiền cọc tạm giữ sẽ trả lại. | Công thức: **totalRevenue − totalDepositRefund**. Loại bỏ phần “tiền cọc đã thu trong kỳ” (sẽ trả lại khách khi trả hàng hoặc hủy), chỉ giữ lại doanh thu từ thuê/bán và phí hư hỏng. Dùng để đánh giá doanh thu kinh doanh thật. |
| **totalDepositRefund** | **Tổng tiền cọc (thế chân) đã thu** trong kỳ. | Thu khi: (1) khách đặt đơn thuê (RESERVED), (2) khách lấy hàng (PICKUPED). Đây là phần “tiền cọc” được trừ ra để tính **totalActualRevenue**. Trên giao diện có thể ẩn nếu chỉ cần nhấn mạnh doanh thu thực tế. |

**Ví dụ nhanh:** Trong kỳ thu 10 triệu (gồm 2 triệu cọc), hoàn 0.5 triệu (hủy đơn).  
→ totalRevenue = 9,5 triệu.  
→ totalDepositRefund = 2 triệu.  
→ totalActualRevenue = 9,5 − 2 = **7,5 triệu** (doanh thu thực tế).

#### Tiền cọc đang giữ và dự kiến trả

| Trường | Bạn hiểu là | Chi tiết / Ví dụ |
| -------------------- | ----------- | ----------------- |
| **totalCollateral** | **Tiền cọc (thế chân) đang giữ** — tổng cọc của các đơn thuê đã lấy hàng, chưa trả. | Chỉ tính đơn thuê đã lấy hàng, và tính theo **ngày lấy hàng** rơi vào kỳ. Cho biết bạn đang nắm bao nhiêu tiền cọc của khách (tài sản nợ khách, cần trả khi họ trả hàng). |
| **totalCollateralPlanExpectedToRefund** | **Tiền thế chân dự kiến trả** — Số tiền cọc bạn sẽ hoàn lại khách trong kỳ. | Chỉ tính đơn thuê **đang cho mượn** (khách đã lấy hàng, đang giữ cọc) có **lịch trả hàng** nằm trong kỳ. Khi khách trả hàng đúng kỳ, bạn sẽ trả lại từng khoản tiền cọc (thế chân) đó. Giúp **chuẩn bị thanh khoản** (biết trong kỳ cần trả bao nhiêu tiền cọc). |
| **totalCollateralPlan** | Cùng nghĩa với **totalCollateralPlanExpectedToRefund**. | Tên khác trong API, cùng một con số. |

#### Doanh thu dự kiến (tương lai)

| Trường | Bạn hiểu là | Chi tiết / Ví dụ |
| -------------------- | ----------- | ----------------- |
| **totalRevenuePlan** | **Doanh thu dự kiến (tương lai)** — ước tính tiền sẽ thu trừ đi cọc sẽ hoàn. | (1) **Thu dự kiến:** từ đơn đặt trước có **lịch lấy hàng sau hôm nay** — ước tính số tiền thuê sẽ thu (tổng đơn trừ cọc đặt trước). (2) **Trừ đi:** tiền cọc sẽ hoàn cho đơn đang thuê có **lịch trả hàng sau hôm nay**. Kết quả = triển vọng doanh thu (chưa phát sinh). |

#### Chỉ có trong API daily

| Trường | Bạn hiểu là |
| ------ | ----------- |
| **totalNewOrders** | Tổng số đơn mới trong kỳ (= tổng newOrderCount của tất cả các ngày). |
| **totalOrders** | Tổng số **dòng** trong danh sách đơn (mỗi dòng là một đơn hoặc một giao dịch doanh thu; một đơn có thể có nhiều dòng nếu nhiều giao dịch trong kỳ). |

---

### Số liệu từng ngày (periods hoặc days)

Mỗi **ngày** trong kỳ có một bản ghi với các trường sau (cùng ý nghĩa với summary nhưng **chỉ trong một ngày**):

| Trường | Bạn hiểu là | Ghi chú |
| ------ | ----------- | ------- |
| **date** | Ngày (dạng YYYY/MM/DD). | Dùng để nhóm, sắp xếp và hiển thị trục ngày. |
| **dateISO** | Cùng ngày, dạng chuẩn (ISO), ví dụ 2026-03-01T00:00:00.000Z. | Dùng khi hiển thị theo múi giờ (ví dụ chuyển sang giờ địa phương). |
| **totalRevenue** | Tổng tiền thu trong ngày đó (đã trừ các khoản hoàn trong ngày). | Có thể âm nếu trong ngày hoàn nhiều hơn thu. |
| **depositRefund** | Tiền cọc thu trong ngày đó (khi đặt đơn hoặc khi lấy hàng trong ngày). | |
| **totalCollateral** | Tiền cọc đang giữ — tính theo các đơn có ngày lấy hàng trong ngày đó. | |
| **totalCollateralPlan** | Tiền thế chân dự kiến trả trong ngày — tổng cọc sẽ hoàn cho các đơn thuê đang cho mượn có lịch trả hàng rơi vào ngày đó. | |
| **newOrderCount** | Số đơn được **tạo** trong ngày. | |
| **pickupOrderCount** | Số đơn **lấy hàng** trong ngày. | |
| **returnOrderCount** | Số đơn **trả hàng** trong ngày. | |
| **cancelledOrderCount** | Số đơn **bị hủy** trong ngày. | |

- **periods** (API summary): chỉ có các trường trên, **không** có danh sách đơn — phù hợp màn tổng hợp, biểu đồ theo ngày.
- **days** (API orders, daily): có thêm **orders** — mảng danh sách từng đơn / từng giao dịch trong ngày (xem bảng “Từng dòng đơn” bên dưới).

---

### Từng dòng đơn trong danh sách (orders)

Mỗi phần tử trong **orders** là **một dòng** trên báo cáo: tương ứng một **giao dịch doanh thu** (thu cọc, thu khi lấy hàng, hoàn khi trả, v.v.) hoặc một **đơn dự kiến** (lấy/trả trong kỳ nhưng chưa diễn ra — khi bật “đơn dự kiến”, revenue = 0).

| Trường | Bạn hiểu là | Chi tiết / Ví dụ |
| ------ | ----------- | ----------------- |
| **id** | Mã đơn hàng trong hệ thống (số). | Dùng để gọi API chi tiết đơn hoặc deep link. |
| **orderNumber** | Mã đơn hiển thị cho khách. | Ví dụ: ORD-001-0001. |
| **orderType** | Loại đơn. | **RENT** = thuê, **SALE** = bán. |
| **status** | Trạng thái đơn tại thời điểm báo cáo. | **RESERVED** = đặt trước, **PICKUPED** = đã lấy hàng, **RETURNED** = đã trả hàng, **COMPLETED** = hoàn thành (bán), **CANCELLED** = đã hủy. |
| **revenue** | Số tiền doanh thu của **dòng này**. | **Dương** = thu tiền (cọc, thuê, bán, phí…). **Âm** = hoàn tiền (hủy, trả cọc). **0** = đơn dự kiến (EXPECTED_PICKUP, EXPECTED_RETURN) chưa phát sinh tiền. |
| **revenueType** | Loại giao dịch doanh thu. | Xem bảng “Loại giao dịch (revenueType)” bên dưới. |
| **description** | Mô tả ngắn giao dịch. | Ví dụ: “Thu tiền khi lấy hàng”, “Đơn dự kiến lấy (chưa lấy)”. Nếu một đơn có nhiều giao dịch trong cùng ngày có thể gộp thành “MULTIPLE” và mô tả gộp. |
| **revenueDate** | Thời điểm phát sinh doanh thu (chuỗi ngày-giờ ISO). | Dùng để sắp xếp hoặc hiển thị “Lúc …”. |
| **customerId** | Mã khách hàng (số). | Có thể null. Dùng cho app/mobile để mở màn chi tiết khách. |
| **customerName** | Họ tên khách (ghép firstName + lastName). | |
| **customerPhone** | Số điện thoại khách. | |
| **outletId** | Mã cửa hàng (số). | Dùng cho app/mobile để mở màn chi tiết cửa hàng. |
| **outletName** | Tên cửa hàng. | |
| **createdAt** | Ngày tạo đơn. | Chuỗi ngày-giờ; có thể không có. Hiển thị “Ngày tạo: …”. |
| **pickupPlanAt** | Lịch dự kiến lấy hàng. | Ngày-giờ khách dự kiến đến lấy hàng. Đơn thuê: thường có; đơn bán: không có. |
| **returnPlanAt** | Lịch dự kiến trả hàng. | Ngày-giờ khách dự kiến trả hàng. Chỉ đơn thuê; không có nếu chưa đặt lịch trả. |
| **totalAmount** | Tổng tiền đơn (theo đơn hàng). | Tổng khách phải trả cho đơn (thuê hoặc bán). |
| **depositAmount** | Tiền cọc đặt trước (deposit). | Thường với đơn thuê khi đặt. |
| **securityDeposit** | Tiền thế chân (cọc khi lấy hàng). | Thu khi khách lấy hàng, hoàn khi trả (trừ phí hư hỏng nếu có). |
| **damageFee** | Phí hư hỏng (nếu có). | Trừ vào cọc khi trả hàng; nếu lớn hơn cọc thì revenue có thể âm (thu thêm). |

---

### Loại giao dịch (revenueType) — Hiển thị và giải thích cho user

| Mã trong API | Ý nghĩa | Khi nào xảy ra | Revenue (dương/âm) |
| ------------ | -------- | -----------------| ------------------- |
| **RENT_DEPOSIT** | Thu cọc khi đặt đơn thuê. | Khách đặt đơn thuê (RESERVED), thu tiền cọc (depositAmount). Không tạo nếu cùng ngày đặt và lấy hàng (khi đó tính gộp vào RENT_PICKUP). | Dương |
| **RENT_PICKUP** | Thu tiền khi khách lấy hàng. | Khách lấy hàng (PICKUPED): thu tiền thuê + cọc thế chân (tiền cọc khi lấy hàng); nếu đã thu cọc trước thì trừ cọc đặt trước. | Dương |
| **RENT_RETURN** | Khách trả hàng — xử lý cọc và phí. | Khách trả hàng (RETURNED): hoàn cọc trừ phí hư hỏng. Nếu phí hư hỏng lớn hơn cọc thì thu thêm → revenue âm (thu tiền). | Thường dương (hoàn cọc); có thể âm nếu thu phí hư hỏng > cọc |
| **RENT_CANCELLED** | Đơn thuê bị hủy — hoàn lại đã thu. | Đơn thuê chuyển sang CANCELLED: hoàn toàn bộ đã thu (cọc, tiền thuê, cọc thế chân…). | Âm |
| **SALE** | Đơn bán — thu tiền khi bán. | Đơn bán (SALE) hoàn thành (COMPLETED): thu totalAmount. | Dương |
| **SALE_CANCELLED** | Đơn bán bị hủy — hoàn lại tiền. | Đơn bán chuyển sang CANCELLED: hoàn lại số tiền đã thu. | Âm |
| **MULTIPLE** | Nhiều giao dịch trong cùng ngày. | Một đơn có nhiều sự kiện doanh thu trong cùng một ngày (ví dụ thu cọc và thu khi lấy hàng cùng ngày). Hiển thị **tổng** revenue và mô tả gộp. | Tùy tổng (dương/âm) |
| **EXPECTED_PICKUP** | Đơn dự kiến lấy trong kỳ (chưa lấy). | Đơn thuê đặt trước có **lịch lấy hàng** rơi vào kỳ báo cáo; chưa lấy nên chưa thu tiền. Chỉ xuất khi bật “đơn dự kiến” (plan=true). | 0 |
| **EXPECTED_RETURN** | Đơn dự kiến trả trong kỳ (chưa trả). | Đơn thuê đang cho mượn có **lịch trả hàng** rơi vào kỳ; chưa trả nên chưa hoàn cọc. Chỉ xuất khi plan=true. | 0 |

---

### Phân trang (pagination) — Khi xem danh sách đơn có giới hạn số dòng/trang

Chỉ có khi gọi API **orders** với tham số **limit** (và tùy chọn **offset**).

| Trường | Bạn hiểu là | Ví dụ |
| ------ | ----------- | ----- |
| **total** | Tổng số dòng đơn trong cả kỳ (sau khi lọc theo status, plan). | 85 = có 85 dòng đơn trong kỳ. |
| **limit** | Số dòng tối đa mỗi trang (đúng bằng tham số limit bạn gửi). | 20 = mỗi trang tối đa 20 dòng. |
| **offset** | Vị trí bắt đầu của trang hiện tại (bằng tham số offset bạn gửi). | 0 = trang đầu; 20 = trang 2 (từ dòng 21). |
| **hasMore** | Còn trang tiếp hay không. | `true` = còn (ví dụ offset + limit < total); `false` = đang ở trang cuối. |

---

## Lỗi chung

- **400** – Thiếu hoặc sai tham số: `MISSING_REQUIRED_FIELD`, `INVALID_DATE_FORMAT`, `INVALID_INPUT`, `INVALID_STATUS` (orders).
- **401** – Chưa đăng nhập hoặc token không hợp lệ.
- **403** – Không có quyền `analytics.view.revenue` hoặc `analytics.view.revenue.daily`.
