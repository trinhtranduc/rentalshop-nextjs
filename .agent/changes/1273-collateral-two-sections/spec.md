# Spec: Thế chân tách 2 phần

Issue: #1273

## Behavior

Áp dụng cho màn "Xem các đơn liên quan" của thẻ Thế chân (iOS `OverviewRelatedOrdersViewController` với `kind == .collateral`, Android `OverviewRelatedScreen` kind COLLATERAL, web `/dashboard/related?kind=collateral`). Ba loại thẻ khác không đổi.

1. Dòng giải thích chung dưới tiêu đề/ngày (T1).
2. PHẦN 1 "Đang giữ thế chân" + chú thích + các dòng đơn đang giữ + "Tổng đang giữ: <tổng> · <N> đơn".
3. PHẦN 2 "Phát sinh hôm nay (<dd/MM>)" + chú thích + dòng Nhận (+) rồi dòng Trả (−) + ba dòng tổng: "Nhận khi giao: +X (N đơn)", "Trả khi nhận đồ: −Y (M đơn)", "Hôm nay shop giữ thêm: +Z".
4. Khoảng không phải đúng một ngày là hôm nay (tuần, tháng, ngày khác): dùng chữ "trong kỳ" thay "hôm nay" (xem "Lệch mockup").

## Cách tính (client, không đổi API)

- Phần 1 = `collateralHeld.orders` của `GET /api/analytics/outlet-operations?collateralHeld=1`. Tổng đang giữ = Σ `securityDeposit`; số đơn = số dòng. Nếu `collateralHeld.count` > số dòng (API cắt 500): hiện số đơn = `count`, ẩn số tiền tổng.
- Phần 2 = dòng `collateral` của `GET /api/analytics/income/orders` (status=all, mọi trang). Nhận = dòng có amount > 0; Trả = dòng amount < 0. X = Σ Nhận; Y = Σ |Trả|; Z = X − Y. Số đơn = số đơn khác nhau (một đơn nhận ở hai ngày của kỳ đếm một đơn, tiền đếm hai lần).
- Hai phần không cộng chéo; một đơn nằm ở cả hai phần được đếm một lần mỗi phần.

## Cũ → Mới

| Cũ | Mới |
|---|---|
| Một danh sách lẫn dòng "Đang giữ" và "Nhận / Trả" | Hai phần: "Đang giữ thế chân", "Phát sinh hôm nay" |
| Không có chú thích | Một dòng giải thích chung + một chú thích mỗi phần |
| Một tổng cuối "Tổng các dòng · 10: 2.400.000" | Phần 1: "Tổng đang giữ"; Phần 2: "Nhận khi giao", "Trả khi nhận đồ", "Hôm nay shop giữ thêm" |
| Số liệu, API | Không đổi |

## Số liệu ví dụ (mockup)

| Mục | Số đơn | Tiền |
|---|---|---|
| Tổng đang giữ (16 dòng) | 16 | 16.200.000 |
| Nhận khi giao (8 dòng +) | 8 | +6.400.000 |
| Trả khi nhận đồ (2 dòng −) | 2 | −4.000.000 |
| Hôm nay shop giữ thêm | | +2.400.000 |

Đơn 490268 nằm ở cả Phần 1 (500.000) và Phần 2 (+500.000): mỗi phần một lần, không cộng chéo.

## Chuỗi mới

13 khóa: iOS `overview.related.collateral.*`, Android `overview_v2_related_collateral_*`, web `home.related.*` (sectionNote, sectionNotePeriod, heldTitle, heldHint, heldTotal, flowTitle, flowTitlePeriod, flowHint, flowHintPeriod, flowIn, flowOut, flowNet, flowNetPeriod). iOS/Android en + vi, web en/vi/ja/ko/zh.

## API compatibility

Không đổi API. App cũ trên main-real giữ màn cũ và gọi cùng endpoint: iOS `RentedOutOrdersViewController.swift:498,523`, Android `OverviewRelatedScreen.kt:71`, web `dashboard/related/page.tsx:48`.
