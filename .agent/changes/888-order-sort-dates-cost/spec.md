# Spec

Status: done

**Rent list "Tất cả đơn"**
- Row: tag + name, `#code`, then `Lấy dd/mm/yy   Trả dd/mm/yy` (planned days, Vietnam civil day). The date the list
  is sorted by has a light blue chip (bold). Sorted by created date: nothing highlighted. Created date only in detail.
- Bar above the list: `Xếp theo ngày lấy · gần nhất trước ▾` (always), right side `N đơn`.

**"Lọc & sắp xếp" sheet**
- XẾP THEO: segmented Ngày lấy / Ngày trả / Ngày tạo.
- THỨ TỰ: Gần nhất trước / Xa nhất trước (Ngày tạo: Mới nhất trước / Cũ nhất trước).
  Request: `sortBy=pickupPlanAt|returnPlanAt|createdAt`, `sortOrder=desc` (first) / `asc` (second) — the meaning the
  app already gave "Ngày giao gần nhất" (desc), so an old filter keeps its order.
- KHOẢNG NGÀY <ngày đã chọn>: Bất kỳ / Hôm nay / 7 ngày tới / Tháng này / Chọn ngày; `dateField` = the sort date.
  The separate date-basis control is removed. Hint: "Sắp xếp và khoảng ngày cùng tính theo <ngày>."
- Default: Ngày lấy, gần nhất trước, any range. "Đặt lại" returns to it. "Việc gần nhất" leaves the sheet; the
  "Việc cần làm" tab keeps its own order.

**Dates dd/mm/yy** on every order row line (orders tab, and the screens that reuse the row), order detail (steps,
"Đã lấy", rental dates, sale day) and the cart dates row. Day = `Asia/Ho_Chi_Minh` civil day.
"Giao" → "Lấy" in these texts (vi); en "Pickup".

**Cart cost (rent and sale)**: role may see prices (`showsPriceFields`: products.manage and not OUTLET_STAFF).
- Line with product cost > 0: `Giá vốn <cost × qty>` under the line.
- Money section: `Tổng giá vốn` (sum of shown line costs) when any line has a cost; sale cart adds
  `Lãi dự kiến` = total (after discount) − total cost, green (red when negative).
- Cost comes from the product the line was added from (`costPrice`, only sent to `products.manage`); a line without
  it shows no cost. Staff: never shown.

**Owner additions (2026-10-12, same issue)**
- Tất cả đơn rows keep "#code · tạo dd/mm/yy" (created day where it was) above "Lấy … · Trả …".
- dd/mm/yy app-wide: every single day (rows, detail incl. created/handed-over, cart, customer orders, product
  orders/history, notifications, overview lists and ranges, today-work, conflict tags, share image); a day with a time
  "05/10/26 14:30". One formatter per platform (iOS `DayFormatter`, Android `DayText`). Calendar month headers and
  the 7-day chart weekday axis stay.
- Status badges default to the old app colours (solid, white text: Đã đặt #EF4444, Đang thuê #F19920, Đã trả
  #16A34A, Đã huỷ #991B1B); Cài đặt row "Màu trạng thái đơn: Đậm (như app cũ) / Nhạt", stored on the device.
  Trễ hạn / Chưa soạn đồ chips unchanged. Mockup https://claude.ai/artifact/Vn6J2UEc6v2XLGoqf2dWEc.

**API compatibility:** none — no API, shared package, schema or env change.
