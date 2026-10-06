# Spec — #496
See the issue for the full copy. Summary:
1. Overview "VIỆC HÔM NAY · <T? dd/mm>" above "ĐƠN": Cần giao hôm nay (remaining = pickupsToday.count,
   sub "Đã giao d/t" with d = doneToday.pickups), Cần nhận trả hôm nay (returnsToday / doneToday.returns).
   Tap → Orders tab. Shown only when outlet-operations data is present.
2. "ĐƠN": red row "Quá ngày lấy, khách chưa đến" = noShows.count → "Chưa lấy đồ".
3. "Chưa lấy đồ · N": GET /api/orders orderType=RENT status=RESERVED sortBy=pickupPlanAt asc; groups split
   at today's Vietnam civil day; chip "Quá x ngày · nên gọi khách"; right "còn thu <amountDue>". Opened from
   both Còn phải thu sheet rows and the overdue row.
4. Order list rows everywhere: no product line; line 1 muted "#code · tạo T? dd/mm"; line 2 by status:
   RESERVED "Giao … · trả …", PICKUPED "Trả …" (late: "Hạn trả …"), RETURNED "Đã trả …", SALE "Bán …",
   CANCELLED "Huỷ …". Weekday short names T2..T7, CN.
5. Product detail order rows: "#code · trả …" left, "Giao …" right, no quantity.
