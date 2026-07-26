# Plan: Order Check → hiển thị đầy đủ đơn hàng khi xem chi tiết

## Bối cảnh & vấn đề

- Màn **Order Check** gọi API **product availability** (theo `productId` + `date`) để liệ kê các đơn có liên quan đến sản phẩm đang kiểm tra.
- Response của API này thường chỉ mang **`orderItems` gắn với sản phẩm đang check**, không phải toàn bộ line items của đơn.
- Luồng cũ: sau khi chọn một dòng trong list → `Cart.fromOrder(order)` + `PreviewViewController(..., order: order)` → user chỉ thấy **một** sản phẩm.

## Quyết định kiến trúc

| Lựa chọn | Đánh giá |
|---------|----------|
| **Mobile: gọi order detail khi chọn đơn** | **Chọn.** Đúng nghĩa API availability (nhẹ, theo SP) và API detail (đầy đủ đơn). |
| Backend: nhét full `orderItems` vào availability | Không bắt buộc. Payload lớn, trùng dữ liệu với order detail; chỉ cần nếu product muốn **không** gọi thêm request. |

## Phạm vi đã implement (mobile)

1. **`InfoMainViewController.didSelectOrder`**  
   - `OrderService.loadOrderDetail(orderId:)` → `Order.from(detail:)` + `Cart.fromOrderDetail(detail)` → push `PreviewViewController(editOrder: fullOrder)`.

2. **`MainViewController.didSelectOrder`**  
   - Cùng pattern: load detail → `PreviewViewController(order: fullOrder)`.

3. **`ImageSearchResultsViewController.didSelectOrder`**  
   - Sheet kết quả tìm ảnh → Order Check → chọn đơn: load detail → push `PreviewViewController` trên `navigationController` của sheet; `PreviewViewControllerDelegate` pop về list kết quả.

4. **`Cart.fromOrderDetail`**  
   - Bổ sung `orderId` và `customer_id` cho chế độ sửa đơn nhất quán với `fromOrder`.

5. **`OrderViewModel.reloadOrderDetail`**  
   - Dùng `Order.from(detail:)` thống nhất, tránh nhân đôi logic mapping.

Files chính:

- `POS ADBD/Viewcontrollers/Main /InfoMainViewController.swift`
- `POS ADBD/Viewcontrollers/Main /MainViewController.swift`
- `POS ADBD/Viewcontrollers/Products/ImageSearchViewController.swift`
- `POS ADBD/Model/Cart.swift`
- `POS ADBD/ViewModels/OrderViewModel.swift`
- (Tham chiếu) `POS ADBD/Model/Order.swift` — `Order.from(detail:)`

## Việc cần làm tiếp (QA & release)

- [ ] **iPad:** Từ giỏ → status / check order → chọn một đơn có nhiều line → preview + giỏ hiển thị **đủ** sản phẩm; customer/deposit/discount khớp detail API.
- [ ] **iPhone:** Cùng flow từ danh sách sản phẩm → Order Check → chọn đơn → preview đủ line.
- [ ] **Image search sheet:** Kết quả tìm ảnh → Check order → chọn đơn → preview đủ line, back pop về sheet.
- [ ] **Offline / lỗi mạng:** Chọn đơn khi `loadOrderDetail` fail → có alert, không push preview với dữ liệu cũ một dòng.
- [ ] **Permission:** User không xem được order detail (403/404) → thông báo rõ (nếu API trả mã cụ thể, có thể tinh chỉnh message sau).

## Hạng mục backend (tùy chọn, sau này)

- Nếu cần giảm **số request**: cân nhắc query param trên availability, ví dụ `includeFullOrderItems=true` (mặc định `false`) — chỉ bật khi client cần; document rõ kích thước response.
- Giữ contract hiện tại: availability = scoping theo sản phẩm; detail = nguồn sự thật cho toàn đơn.

## Ghi chú release (gợi ý)

> Order Check: khi mở chi tiết đơn, app gọi API order detail để hiển thị đầy đủ sản phẩm trong đơn thay vì chỉ line đang kiểm tra.
