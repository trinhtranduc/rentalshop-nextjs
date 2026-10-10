# Intent: orders from the pre-#413 Android cart read back with the return one day late

Issue: #577

The owner wants the days chosen at order creation to be the days every screen shows ("lúc tạo đơn chọn ngày
… lúc load về phải chuẩn"). Android before #413 is still installed on shop phones and sends
`pickupPlanAt = P T00:00:00Z`, `returnPlanAt = R T23:59:00Z`. `R T23:59Z` is R+1 06:59 in Vietnam, so detail,
list filters, calendar and availability all show R+1.

Constraints: installed apps cannot be force-updated; additive only; no data migration without the owner's go;
current apps and web must not change behaviour.
