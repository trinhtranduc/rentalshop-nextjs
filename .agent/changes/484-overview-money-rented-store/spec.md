# Spec — Clearer Overview money, rented-out list, store info screen

Issue: #484 · Status: accepted · Intent: ./intent.md

## Behavior

1. A rent order returned on a different day than pickup yields a return event of
   `damageFee + lateFee - securityDeposit`.
2. A rent order picked up and returned the same day yields `totalAmount + damageFee + lateFee`.
3. `calculateOrderRevenueByStatus` for RETURNED is `totalAmount + damageFee + lateFee`.
4. `GET /api/analytics/period` keeps every existing field and adds:
   - `revenue.totalOrderValue`: sum of `totalAmount` of orders created in the period, not CANCELLED.
   - `revenue.outstanding`: for those orders, money not yet collected: RENT RESERVED `max(0, totalAmount - depositAmount)`,
     SALE not COMPLETED `totalAmount`, otherwise 0.
   - `series[].newOrderCount`: orders created that day (same rule as `operational.orderCounts.new`).
5. iOS and Android Overview:
   - headline label "Tiền đã thu" with an (i) button that opens an explanation sheet;
   - tiles "Tổng giá trị đơn" and "Còn phải thu" when the API sends them (hidden on an older API);
   - chart toggle "Tiền thu | Số đơn" (orders = `newOrderCount`);
   - top products header "Thuê nhiều nhất · theo giá trị đơn";
   - "Đang cho thuê", "Đang thuê · trễ hạn trả" open the rented-out list.
6. Rented-out list: no header card; back + title with count; overdue group first, then the rest by return date.
7. Store info screen: same fields as today (name required, phone, address, city, state, country, postal code,
   description), v2 form style (label above field, no icons in fields, address grouped, Cancel/Save footer).
8. All new strings exist in every locale the app ships.

9. `GET /api/analytics/period` also adds `revenue.collected`, `series[].collected` and `growth.collected`: the same
   money without collateral (pickup collects `totalAmount - depositAmount`, return collects `damageFee + lateFee`).
   Existing `realIncome`, `totalRevenue`, `totalActualRevenue` and `growth.revenue` keep their meaning.
10. Both apps show `collected` when present (headline, bars, growth) and fall back to the old fields; the info sheet
    lists collateral as "không tính".

## Out of scope

- Changing collateral handling in web income reports.
- Web admin/client changes.
