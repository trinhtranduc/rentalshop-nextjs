# Spec — #719

1. Web `/dashboard`: tile Giá trị đơn mới shows a chip "N đơn mới" after the growth chip.
2. iOS Báo cáo: the same chip on the tile; it is read out with the tile.
3. Android Báo cáo (older hero layout): the line under the value starts with "N đơn mới ·".
4. N = `revenue.orderValueByType.rent.orders + sale.orders`; never `operational.orderCounts.new` (counts later-cancelled orders, #716).
5. An API without `orderValueByType`: no count.
6. No API change.
