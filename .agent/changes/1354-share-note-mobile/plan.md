# Plan — Ghi chú đơn trên ảnh chia sẻ (mobile)

Issue: #1354 · Status: done

Skills: mobile-parity, api-compat-review (không đổi API), verify-change, mobile-e2e-local.

1. Test đỏ (iOS rồi Android): `ShareOrderNoteRule`/`ShareNoteClip`/model; commit `test(mobile): reproduce ...`.
2. iOS: `Merchant.shareOrderNote`, `ShareOrderNoteStore` (đọc / lưu / làm mới như `OverlapSetting`), `OrderShareSource.orderNote`, `OrderShareModel.orderNote`, `OrderShareRenderer` vẽ khối, `TabsV2APIService` đọc / ghi, `PrinterConfigurationViewController` thêm dòng, làm mới ở `AppDelegate` (foreground, cold start), màn In & phiếu và `OrderSharePresenter.share`.
3. Android: tương tự (`ShareOrderNoteSetting`, `OrderShareModel`, `OrderShareRenderer`, màn In & phiếu, `ApiClient`, `SessionStore`).
4. Build, test, kiểm trực quan trên Simulator (API cục bộ, DB riêng), ảnh vào `~/Documents/AnyRent-shots/sharenote-mobile/`.
5. `.agent/api-changes/LOG.md`: không đổi API; không thêm dòng (chỉ dùng khoá có sẵn). PR vào `dev`.
