# Intent — #725 Android Báo cáo uses the iOS layout

Owner (2026-10-10): "ui mobile báo cáo cần giống ios".

- **What:** the Android Overview tab draws what iOS draws (`OverviewV2ViewController`, `OverviewDashViews`,
  `OverviewDashLogic`): header with the range, period chips, four tiles that open a sheet each, the
  "Thực thu theo ngày" chart, the Hôm nay card, Top sản phẩm / Top khách hàng.
- **Why:** the two apps showed the same numbers (#722) in different layouts; iOS is the reference.
- **Constraints:** no API change; numbers stay as #722 made them; role behaviour stays (`showsRevenue`,
  `showsOperations`); Vietnam civil day for today; nothing iOS does not have.
