# Spec — Widget "Việc cần làm" và đồng bộ lịch hệ thống

Issue: #1372 (docs: #1373) · Status: widget ĐÃ CHỐT (2026-10-31, Phương án 1 đang code); thiết kế giàu hơn (P2, P3) chờ chọn; lịch hệ thống chờ, làm sau · Intent: ./intent.md

Thứ tự: **Phần 1 widget làm trước** (iOS rồi Android). **Phần 2 lịch hệ thống làm sau, chưa làm, chờ widget xong.**

## 1. Quyết định

### 1a. Widget: ĐÃ CHỐT (2026-10-31, chủ shop chốt theo mặc định đơn giản nhất). Người code không phải đoán.

| # | Quyết định | Nội dung đã chốt |
|---|---|---|
| W1 | Cách hiện | **A1 tự hiện**: thêm widget một lần, luôn hiện việc cần làm hôm nay. **Không** tự ghim từng đơn (A2 để việc sau). |
| W2 | Hiện việc gì | Trễ hạn, rồi Giao hôm nay, rồi Trả hôm nay (cùng thứ tự tab Việc cần làm); dòng Giao có thêm "Chưa soạn đồ". **Không** hiện "Ngày mai" trong danh sách. |
| W3 | Số dòng | iPhone vừa: số đếm + 3 dòng; iPhone nhỏ: chỉ 3 con số; Android: số đếm + 4 dòng. Dòng cuối "+N việc khác". |
| W4 | Cỡ widget | iPhone: nhỏ (2×2) và vừa (4×2). Android: một widget kéo giãn được, tối thiểu 4×2. **Không** có cỡ lớn, **không** có widget màn hình khoá. |
| W5 | Riêng tư | Hiện tên khách trên màn hình chính; iPhone đặt `.privacySensitive()` nên tự làm mờ tên khi máy khoá; thêm công tắc "Ẩn tên khách trên widget" trong Cài đặt, mặc định **tắt**. **Không** hiện tiền, **không** hiện số điện thoại. |
| W6 | Chạm | Chạm dòng: chi tiết đơn đó. Chạm đầu widget (số đếm): tab Đơn hàng, mục Việc cần làm. Chưa đăng nhập: màn đăng nhập. |
| W7 | Vai trò, chi nhánh | Ai thấy Việc cần làm trong app thì thấy widget (chủ shop, quản lý chi nhánh, nhân viên, nhân viên kho). Nhân viên chỉ chi nhánh mình; chủ shop theo chi nhánh app đang chọn. Không có quyền xem Việc cần làm (403): "Tài khoản này không có Việc cần làm". |
| W8 | iPad | Dùng luôn widget nhỏ và vừa của iPhone; **không** vẽ bố cục riêng. |
| W9 | Trạng thái | Trống: "Hôm nay chưa có việc" (+ "Mai có N giao, M trả" nếu API có `tomorrow*`). Chưa đăng nhập: "Mở AnyRent để đăng nhập". Không quyền: như W7. Cũ (qua ngày VN chưa cập nhật): "Mở app để cập nhật" kèm lần cuối. |
| W10 | Làm mới | iPhone: ghi dữ liệu và làm mới widget mỗi khi mở app, đổi chi nhánh, tạo / lấy / trả / huỷ đơn; **không** tự gọi mạng khi chưa mở app; sang ngày mới VN thì tự đổi sang "Cũ". Android: thêm làm mới nền (WorkManager) 30 đến 60 phút, nút ↻ trên widget. Hai nền tảng khác nhau ở điểm này có chủ ý. |
| W11 | A3: gợi ý thêm widget | Sheet "Thêm vào widget" **chỉ là hướng dẫn**: iPhone hiện 3 bước (giữ lâu màn hình chính, bấm +, chọn AnyRent, chọn cỡ) vì iOS **không có API** cho app tự thêm widget; Android có nút "Thêm widget" gọi `AppWidgetManager.requestPinAppWidget` (API 26+, đúng minSdk 26), launcher không hỗ trợ (`isRequestPinAppWidgetSupported` = false) thì hiện hướng dẫn như iPhone. Kèm **một thẻ gợi ý nhỏ trong tab Đơn, hiện một lần**, có "Cách thêm" và "Không hỏi lại"; **không** hỏi mỗi lần có việc mới, **không** bật sheet tự động. Thẻ chỉ hiện khi hôm nay có việc, máy chưa có widget (iOS `WidgetCenter.getCurrentConfigurations`, Android `getAppWidgetIds` rỗng) và chưa bấm "Không hỏi lại" (cờ lưu theo máy). Dòng "Widget" trong Cài đặt mở lại sheet bất cứ lúc nào. |
| W12 | API | Không cần API mới (mục 6). |

### 1b. Lịch hệ thống: CHƯA CHỐT, làm sau widget (chưa làm, chờ widget xong)

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| L1 | Ngày nào, cách nào? | Ngày lấy và ngày trả, chọn từng cái; từng đơn bằng nút "Thêm vào lịch" ở chi tiết đơn (B1). Không tự đồng bộ (B2), không đăng ký `.ics` (B3) ở đợt đầu. |
| L2 | Sự kiện trông thế nào, ai dùng? | Cả ngày, không tự đặt nhắc (người dùng chọn trong cửa sổ lịch). Tiêu đề "Giao đồ · Chị Diệu · #490268" / "Nhận trả · …"; ghi chú: món + số đơn + `anyrent://order/<id>`; không SĐT, không tiền, không địa chỉ. Mọi vai trò xem được đơn đều có nút; chỉ với đơn thuê chưa huỷ, chưa trả xong. |

### 1c. Câu hỏi mới về thiết kế widget: CHỜ CHỐT (2026-10-31, sau khi chủ shop xem mockup "hiện đơn giản quá")

Phương án 1 (đã chốt ở 1a) vẫn đang được code. Ba câu dưới đây chỉ ảnh hưởng các PR sau; mặc định đề xuất cho phép bắt đầu không cần chờ.

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| D1 | Sau Phương án 1, chọn **Phương án 2 (thẻ có màu)** và/hoặc **Phương án 3 (cỡ lớn + màn hình khoá)**? | Làm Phương án 2 ngay sau P1, không ảnh món. Cỡ lớn (một phần của P3) làm sau P2 nếu thích. Widget màn hình khoá để chủ shop quyết riêng (đổi lại W4 và W5). |
| D2 | **Màu "Trả"**: cam (theo chủ shop, mockup mới) hay tím (như app hiện nay, `DS.Status.returning`, tab 40)? | Cam cho Trả trên widget như mockup mới (Trễ đỏ, Giao xanh AnyRent, Trả cam), "Chưa soạn đồ" là chữ cam + biểu tượng cảnh báo, không nền, để không lẫn. Nếu chủ shop muốn đồng bộ với app thì đổi Trả sang tím, hoặc đổi app sang cam ở một PR riêng (không nằm trong widget). |
| D3 | **"Hiện số tiền còn thu"** trên widget? | Chưa làm trong bản đầu. Nếu làm sau: công tắc trong Cài đặt widget, mặc định TẮT, chỉ chủ shop / quản lý (người có quyền xem tiền) thấy công tắc; số tiền chỉ được ghi vào dữ liệu widget khi BẬT; không bao giờ hiện trên widget khoá màn hình; cảnh báo riêng tư trong Cài đặt. |

## 2. Hiện trạng và khả thi (origin/dev, commit 10096cf45)

### iOS

| Mục | Hiện trạng | File:line |
|---|---|---|
| Extension WidgetKit | Có một extension `AnyRentLiveActivity` chỉ chứa Live Activity giỏ nháp: `WidgetBundle` có một widget | `apps/mobile/AnyRentLiveActivity/AnyRentLiveActivityBundle.swift:4-9`, `Info.plist` (NSExtension `com.apple.widgetkit-extension`) |
| Bundle id | App `com.anyrent` (debug `com.anyrent.debug`); extension `com.anyrent.liveactivity` (debug `com.anyrent.debug.liveactivity`) | `apps/mobile/POS ADBD.xcodeproj/project.pbxproj:2633,2552,2756,2730` |
| iOS tối thiểu | Project 15.0; extension 16.1 (nên widget chỉ có trên iOS 16.1 trở lên; số người dùng iOS 15: Not verified) | `project.pbxproj:2419,2723` |
| Swift | App Swift 4.0; code chung với extension nằm trong static lib `DraftOrderActivity` Swift 5.0, app gọi qua cầu `DraftOrderLiveActivityBridge` | `project.pbxproj:2557,2663`, `apps/mobile/DraftOrderActivity/DraftOrderLiveActivityBridge.swift:5-6` |
| Script thêm target | `patch_live_activity_pbxproj.py` chèn lib + extension vào `project.pbxproj` | `apps/mobile/scripts/patch_live_activity_pbxproj.py:1-60` |
| App Group | **Chưa có.** `git grep "group\."` trong `apps/mobile` không ra. Entitlements của app chỉ có `aps-environment` | `apps/mobile/POS ADBD/POS ADBD.entitlements`, `project.pbxproj:2495,2576` |
| Token | Refresh token trong Keychain `ThisDeviceOnly`, không có access group, **đổi mỗi lần refresh**; access token nằm trong `User` ở `UserDefaults.standard` (không chia sẻ được với extension) | `AuthSession.swift:82-97,149-160`, `Model/User.swift:276-283` |
| Dữ liệu Việc cần làm | `GET /api/analytics/outlet-operations` qua `loadOutletOperations`; model `TodayWork` / `TodayWorkRow` (tên, món, `lateDays`, `isReadyToDeliver`, tiền…) | `Library/Services/AnalyticsAPIService.swift:919-955`, `Model/TodayWork.swift:18-95` |
| Nạp dữ liệu | Chỉ gọi mạng, không cache; 403 = không có quyền, ẩn mục | `ViewModels/OrdersHomeViewModel.swift:858-877` |
| Chữ và màu thẻ | `workChips`, `todaySections`, `badgeCount` (Trễ + Hôm nay) | `OrdersHomeViewModel.swift:302,427-453` |
| URL scheme | `anyrent://` đã đăng ký nhưng handler **coi mọi URL là "mở giỏ nháp"** → phải tách theo host để `anyrent://order/<id>` mở đơn | `Info.plist:96-108`, `Application/AppDelegate.swift:20-26` |
| Đăng xuất | `User.reset()` xoá token và user | `Model/User.swift:276-283` |
| iPad | App chạy iPhone + iPad (`TARGETED_DEVICE_FAMILY = "1,2"`) | `project.pbxproj` |
| Ký số | Team `2K6L2KZC9A`; fastlane không có bước ký riêng cho extension (cách ký extension hiện tại: Not verified) | `project.pbxproj:2402`, `apps/mobile/fastlane/Fastfile` |

### Android

| Mục | Hiện trạng | File:line |
|---|---|---|
| SDK | compileSdk 36, minSdk 26, targetSdk 36 | `apps/mobile-android/app/build.gradle.kts:27-34` |
| Thư viện | **Chưa có** Glance, `appwidget`, WorkManager (`git grep -i "appwidget\|glance\|workmanager"` rỗng); có Compose, OkHttp, coroutines | `app/build.gradle.kts:93-131` |
| Manifest | Quyền: INTERNET, POST_NOTIFICATIONS, CAMERA, LOCATION, BILLING; **không** có quyền lịch; đã có intent-filter `anyrent://order` | `app/src/main/AndroidManifest.xml:4-10,33-39` |
| Mở đơn từ URL | `MainActivity` đã lấy id từ `intent.data.lastPathSegment` → `anyrent://order/123` chạy được | `MainActivity.kt:58-61` |
| Dữ liệu | `DefaultTodayWorkRepository.load()` gọi `outlet-operations`, không cache; model `TodayWork` | `data/repository/DefaultTodayWorkRepository.kt:17-54`, `domain/orders/TodayWorkModels.kt:25-36` |
| Phiên | `SessionStore` (SharedPreferences, refresh token mã hoá) cùng tiến trình với widget → widget Android **tự gọi API được**, refresh một lần một (`refreshLock`) | `data/SessionStore.kt:17-68`, `data/ApiClient.kt:54-64` |
| Chưa chắc | Gọi `ApiClient.get()` từ Worker khi không có Activity (khởi tạo `CurrentOutlet`, `SessionStore.init` trong `AnyRentApp`): Not verified, kiểm khi code | |

### API nguồn dữ liệu

`GET /api/analytics/outlet-operations` (quyền `analytics.view.dashboard`, `route.ts:131`): trả `date` là ngày VN (`route.ts:189`), `pickupsToday`, `returnsToday`, `overdueReturns`, `noShows`, `tomorrowPickups`, `tomorrowReturns` (mỗi nhóm `count` + tối đa 50 dòng), `lateDays`, `isReadyToDeliver`, `productNames`. Nhân viên chỉ thấy chi nhánh mình, chủ shop theo `outletIds` (`route.ts:140-157`). Đủ cho widget; không cần field mới.

### Lịch hệ thống (phần làm sau)

- iOS: `Info.plist` chưa có chuỗi `NSCalendars...`; chưa dùng EventKit.
- Android: chưa có `CalendarContract`, chưa có `READ/WRITE_CALENDAR`.
- Ngày lấy / trả của đơn: `Order.pickupPlanAt` / `returnPlanAt` là `DateTime` (`prisma/schema.prisma:415`) nhưng app chỉ hiện ngày (`DayFormatter.dmy`, `OrdersHomeViewModel.swift:442`). Phần giờ có nghĩa thật hay không: **Not verified** (cần xem dữ liệu thật) → mặc định sự kiện cả ngày.
- Tab Lịch: iOS `CalendarV2ViewController` / Android `ui/calendar/v2`, nguồn `GET /api/calendar/orders/*` (`ApiClient.kt:1077,1106,1124`).

## 3. Phương án cho widget

### A. "Add vào widget" là gì

| | A1 · Tự hiện (**đã chốt**) | A2 · Tự ghim từng đơn/việc (để sau) | A3 · Hỏi có thêm widget không (**đã chốt dạng hướng dẫn + thẻ một lần**, đi kèm A1) |
|---|---|---|---|
| Là gì | Widget luôn hiện việc hôm nay | Widget chỉ hiện đơn đã ghim | Không phải cách hiện: là lời mời thêm widget |
| Người dùng làm gì | Thêm widget một lần | Thêm widget + bấm ghim từng dòng | iPhone: làm 3 bước theo hướng dẫn; Android: bấm "Thêm widget" (hộp thoại hệ thống) |
| Nội dung | Mọi việc hôm nay, không sót | Chỉ đơn đã ghim, dễ sót, dễ trống | Theo A1 |
| Trong app | Không nút mới | Nút ghim ở mọi dòng, nơi lưu ghim, tự bỏ khi đơn xong, đồng bộ nhiều máy; iPhone chỉ ghi cờ ghim được khi widget đã có (App Group) | Thẻ một lần ở tab Đơn + sheet hướng dẫn + dòng Widget ở Cài đặt |
| Giới hạn hệ điều hành | Không | Như bên | iOS không có API tự thêm widget (chỉ hướng dẫn); Android `requestPinAppWidget` cần launcher hỗ trợ |
| Phiền | Không | Phải nhớ ghim | Hỏi mỗi lần có việc mới = phiền (không làm); một lần + "Không hỏi lại" = không phiền |
| Công sức | Nhỏ | Vừa đến lớn | Nhỏ |

### B. Dữ liệu đến widget

| | B-snap · App ghi sẵn, widget đọc (iOS, đã chốt) | B-self · Widget tự gọi API (Android, đã chốt) |
|---|---|---|
| iOS | App Group + file JSON; không đụng token; không cần API mới | Cần token trong Keychain access group; access token chỉ sống 1 giờ; refresh token đổi mỗi lần → extension refresh đua với app có thể làm **đăng xuất cả máy**. Không làm. |
| Android | Cũng được (cho giống iOS) nhưng chậm hơn | Cùng tiến trình với app, dùng `ApiClient` và `SessionStore`; WorkManager 30 đến 60 phút |
| Cũ | Hiện "cập nhật hh:mm"; qua ngày thì báo cũ | Nhẹ hơn; vẫn báo cũ khi mất mạng |

Khác biệt iOS và Android ở bản đầu (iOS không tự làm mới khi chưa mở app) là có chủ ý; chữ, thứ tự và trạng thái giống nhau. Muốn iOS tự làm mới khi chưa mở app thì cần cách lấy dữ liệu an toàn cho extension (xem mục 6, "Để sau").

## 4. Hành vi của widget (đánh số để kiểm)

1. Dữ liệu lấy từ cùng danh sách với tab Việc cần làm: `OrdersHomeLogic.todaySections(from:)` (iOS) / logic tương ứng của Android; **Trễ** = các dòng nhóm trễ, **Giao** = giao hôm nay, **Trả** = trả hôm nay (dòng trễ không đếm lần nữa). Không có "Ngày mai" trong danh sách; chỉ dùng cho dòng "Mai có N giao, M trả" ở trạng thái trống khi API có `tomorrow*`.
2. Số đếm đúng với `count` của API, không phải số dòng đã cắt (API cắt 50 dòng).
3. Thứ tự dòng: Trễ trước, rồi Giao, rồi Trả; trong nhóm giữ thứ tự API. iPhone vừa 3 dòng; Android 4 dòng; dòng cuối "+N việc khác" (N = tổng trừ số dòng đang hiện).
4. Dòng: thẻ Giao / Trả, tên khách, bên phải: "Trễ N ngày" (đỏ) ưu tiên, rồi "Chưa soạn đồ" (cam, chỉ dòng Giao), còn lại tên món đầu. Chữ lấy từ chuỗi đã có của app (`orders.v2.notPrepared`, `LateText.days`).
5. Không có tiền, không có số điện thoại trong dữ liệu widget (kiểm bằng test trên bản ghi).
6. Trống: "Hôm nay chưa có việc" (+ "Mai có N giao, M trả" nếu có). Chưa đăng nhập: "Mở AnyRent để đăng nhập". Không có quyền (403): "Tài khoản này không có Việc cần làm". Cũ: "Mở app để cập nhật" kèm lần cuối.
7. **Ngày VN:** dữ liệu ghi kèm `date` (khoá `YYYY-MM-DD` ngày VN của API). Widget so với ngày VN hiện tại (`Asia/Ho_Chi_Minh`); khác nhau thì là "Cũ", **không bao giờ** hiện danh sách của hôm qua như hôm nay. Kiểm ở `16:59:59Z` và `17:00:00Z`, và với `TZ=UTC` lẫn `TZ=Asia/Ho_Chi_Minh` của máy.
8. Qua nửa đêm VN, widget iOS tự đổi sang "Cũ" đúng lúc (entry thời gian đặt ở nửa đêm VN, không cần mở app).
9. Chạm dòng: `anyrent://order/<id công khai>` mở chi tiết đơn (id số, không CUID). Chạm đầu widget: `anyrent://todo` mở tab Đơn hàng, Việc cần làm. iOS: `AppDelegate` tách theo host; URL cũ (giỏ nháp của Live Activity) vẫn mở giỏ nháp.
10. Đăng xuất (`User.reset()`), đổi tài khoản, hoặc phiên hết hạn: xoá dữ liệu widget, widget về "Mở AnyRent để đăng nhập" và `WidgetCenter.reloadAllTimelines()`.
11. Đổi chi nhánh (chủ shop) → ghi lại dữ liệu và làm mới widget. Dữ liệu ghi theo tài khoản; không lẫn khi đổi tài khoản.
12. iOS: tên khách đặt `.privacySensitive()`; có công tắc "Ẩn tên khách trên widget" (Cài đặt), bật thì dữ liệu ghi không chứa tên. Android: công tắc cùng tên và cùng hiệu lực.
13. **Thẻ gợi ý (W11):** hiện ở đầu danh sách tab Đơn, mục Việc cần làm, đúng khi: dữ liệu Việc cần làm tải được và có ít nhất một dòng, máy chưa có widget AnyRent, cờ "Không hỏi lại" chưa đặt. Bấm "Không hỏi lại" đặt cờ và thẻ biến mất vĩnh viễn; thêm widget xong thì thẻ cũng biến mất; **không** bao giờ hiện sheet tự bật. Không hiện cho tài khoản không có Việc cần làm (403).
14. **Sheet "Thêm vào widget":** mở từ "Cách thêm" hoặc dòng "Widget" ở Cài đặt (mở được cả khi đã "Không hỏi lại"). iPhone: 3 bước + hình xem trước; nút "Đã hiểu" đóng sheet, nút "Không hỏi lại" đặt cờ. Android: nút "Thêm widget" gọi `requestPinAppWidget`; không hỗ trợ thì hiện 3 bước như iPhone.
15. Hai nền tảng cùng chữ, cùng thứ tự, cùng trạng thái (mobile-parity); iOS là chuẩn.

## 5. Dữ liệu widget (snapshot, chỉ phía app)

JSON nhỏ, ghi ở App Group (iOS) / lưu trong app (Android). Không phải API. Trường (đề xuất):

```json
{
  "v": 1, "userId": 123, "outletId": 5, "date": "2026-10-31", "savedAt": "2026-10-31T01:12:00Z",
  "state": "ok",                          // ok | noAccess (403) | loggedOut (file bị xoá)
  "hideNames": false,
  "counts": { "late": 1, "pickup": 3, "return": 2, "tomorrowPickup": 2, "tomorrowReturn": 1 },
  "rows": [ { "orderId": 490268, "kind": "pickup", "name": "Hà Gia Bảo", "product": "Áo dài gấm đỏ",
              "lateDays": 2, "notPrepared": false } ],      // tối đa 8, không tiền, không SĐT
  "labels": { "today": "Hôm nay", "giao": "Giao", "tra": "Trả", "empty": "Hôm nay chưa có việc" }
}
```

Nhãn do app ghi sẵn bằng ngôn ngữ app (đúng cách `DraftOrderLiveActivityBridge.start(...)` đang truyền chuỗi), nên extension không cần file chuỗi riêng.

## 6. API (CHỈ THÊM) và tương thích app cũ

**Widget bản đầu không cần API mới.** Cả hai app đã gọi `outlet-operations`; không route mới, không migration, không env mới, không đổi field.

| Route / area | Change | Old iOS | Old Android | Web | Risk |
|---|---|---|---|---|---|
| `GET /api/analytics/outlet-operations` | không đổi; app mới chỉ đọc thêm để ghi dữ liệu widget | `AnalyticsAPIService.swift:919` (không đổi) | `DefaultTodayWorkRepository.kt:18` (không đổi) | `outletOperations` (`packages/utils/src/config/api.ts:772`), không đổi | none |
| URL scheme `anyrent://order/<id>` | thêm vào app mới (iOS tách theo host); app cũ không nhận widget nên không gặp | iOS cũ: mọi `anyrent://` mở giỏ nháp (`AppDelegate.swift:20-26`), không ai gửi URL mới tới app cũ | Android đã nhận `anyrent://order` (`AndroidManifest.xml:33-39`) | n/a | none |

So sánh với release customers đang chạy: tag `release-*` mới nhất (tên tag cụ thể điền ở PR code, `git describe --tags --abbrev=0 --match 'release-*' origin/main-real`). Rà tương thích lần 1 (issue): xong, kết quả "No API change". Lần 2 (PR code): làm lại trên diff thật.

Dòng `.agent/api-changes/LOG.md`: **không thêm** cho bản mặc định (không có thay đổi API). Chỉ khi chủ shop chọn thêm việc sau, thêm dòng `planned`:

- Endpoint tóm tắt nhẹ cho widget tự gọi (chỉ thêm): `2026-xx-xx | #1372 / #<PR> | new GET /api/mobile/widget/today (read-only, không tiền, không SĐT) | additive route | does not call it | does not call it | n/a | none for old apps; cần cách xác thực an toàn cho extension (token riêng) nên phải review auth | planned`. Cần thiết kế token riêng có hạn và thu hồi được; **không** làm ở bản đầu.
- Bản đăng ký `.ics` (B3, phần lịch): route mới + bảng mã bí mật (migration chỉ thêm) + route công khai theo mã → human review (`review-pr`: `prisma/`).

## 7. Quyền

| | iOS | Android |
|---|---|---|
| Widget | Không xin quyền. Thêm entitlement `com.apple.security.application-groups` cho app **và** extension (`group.com.anyrent`, debug dùng chung, qua build setting `APP_GROUP_ID`). **Chủ shop phải đăng ký App Group trên Apple Developer và tạo lại provisioning của 4 bundle id** (`com.anyrent`, `com.anyrent.debug`, `com.anyrent.liveactivity`, `com.anyrent.debug.liveactivity`) trước khi lên TestFlight. Simulator không cần. | Không xin quyền. WorkManager tự thêm `RECEIVE_BOOT_COMPLETED` (quyền thường, không hộp thoại). |
| Google Play Data safety | | Không đổi: widget chỉ hiện dữ liệu app đã có, không thu thập hay chia sẻ thêm. |
| Lịch (làm sau) | B1: iOS 17 trở lên cửa sổ thêm sự kiện của hệ thống không cần quyền; iOS 15, 16 có thể cần `NSCalendarsUsageDescription` (Not verified, thử trên Simulator iOS 16). B2 cần `NSCalendarsFullAccessUsageDescription` (iOS 17) / `NSCalendarsUsageDescription`. | B1: Intent `ACTION_INSERT` không cần quyền. B2: `READ_CALENDAR` + `WRITE_CALENDAR` (quyền nhạy cảm, khai Data safety). |

## 8. Lịch hệ thống (LÀM SAU, chưa làm, chờ widget xong)

Chỉ giữ phương án và câu hỏi (câu 7, 8). Mockup hướng B1 ở tab "★ Thêm vào lịch hệ thống".

| | B1 · Nút "Thêm vào lịch" (đề xuất) | B2 · Tự đồng bộ lịch "AnyRent" | B3 · Đăng ký `.ics` |
|---|---|---|---|
| Quyền | Gần như không | Lịch đầy đủ / READ+WRITE_CALENDAR | Không xin trong app |
| Riêng tư | Chỉ khi bấm | Mọi đơn tự vào lịch | Đường dẫn bí mật trên máy chủ bên thứ ba |
| Đơn đổi / huỷ | Không tự cập nhật; bấm hai lần = hai sự kiện | Tự cập nhật khi mở app; dễ trùng giữa máy | Tự cập nhật (Google làm mới chậm, khoảng 1 ngày) |
| Nhiều máy | Mỗi máy tự bấm | Dễ trùng | Mọi máy cùng tài khoản lịch |
| Hai nền tảng | Có, nhỏ ở mỗi bên | Có, mỗi bên khác nhiều (Android lịch riêng không lên Google) | iPhone dễ; Android khó (thường phải vào web) |
| Công sức | Nhỏ | Lớn | Lớn: API + migration + bảo mật |
| API | Không | Không | Có: route + bảng + route công khai |

Ngày trong sự kiện là ngày VN: iOS `isAllDay` dựng từ khoá ngày VN (không từ instant theo múi giờ máy); Android `ALL_DAY` dùng nửa đêm UTC của ngày đó (đặc thù Android). Test ở `16:59:59Z` và `17:00:00Z`.

## 9. Phương án thiết kế widget (mockup: tab "★ Widget: Việc cần làm")

Sau khi xem bản đã chốt, chủ shop thấy "hiện đơn giản quá" và muốn xem bản giàu thông tin hơn. Mockup có 3 phương án, cùng dữ liệu minh hoạ tiệm áo dài, sáng và tối, đủ các trạng thái (trống, xong hết, chưa đăng nhập, cũ, ẩn tên). Chọn ở câu D1.

### 9.1 Quy ước chung cho cả 3 phương án (cập nhật 2026-10-31)

- **Mỗi dòng việc:** nhãn loại việc có **màu và biểu tượng nhỏ** (TRỄ đồng hồ đỏ `B91C1C`, GIAO mũi tên ra xanh AnyRent `1D4ED8`, TRẢ mũi tên vào cam `C2410C`; nền đậm, chữ trắng như tab 45), tên khách, **tên món đầu tiên và số món còn lại** ("Áo dài gấm đỏ +1"), phần phải: "Hôm nay" (kèm giờ nếu có), hoặc **"Trễ N ngày" đậm đỏ** (nhóm Trễ), hoặc "Chưa soạn đồ" (chỉ dòng GIAO, chữ cam + biểu tượng cảnh báo, không nền).
- **Giờ ("Hôm nay · 14:00"):** chỉ hiện khi đơn có giờ lấy/trả. **Chưa xác minh dữ liệu:** app hiện chỉ hiện ngày (`DayFormatter.dmy`, `OrdersHomeViewModel.swift:442`); `pickupPlanAt` có mang giờ thật hay không cần kiểm trên dữ liệu thật. Nếu không có giờ thì dòng chỉ ghi "Hôm nay".
- **Tên món:** `TodayWorkRow.productNames` (chuỗi nối) và `items[]` đã có ở API (`route.ts:97,104-107`); snapshot lưu `product` = tên món đầu + `moreCount` (không cần API mới).
- **Màu Trả cam** là thay đổi so với app và tab 40 (tím): xem câu D2.
- **Tiền còn thu:** không hiện mặc định (đã chốt). Công tắc "Hiện số tiền còn thu" (mặc định TẮT) chỉ vẽ trong mockup; xem câu D3. Dữ liệu đã có (`amountDue`, `OrdersHomeViewModel.swift:483`), nên không cần API, nhưng số tiền chỉ được ghi vào snapshot khi công tắc BẬT và có test cho cả hai trạng thái.
- Chữ trong widget không nhỏ hơn 12 (theo bậc chữ của app `DS.TextSize`).

### 9.2 So sánh

| | Phương án 1 · Đơn giản (**đã chốt, đang code**) | Phương án 2 · Thẻ có màu | Phương án 3 · Lớn + màn hình khoá |
|---|---|---|---|
| Cỡ | iPhone nhỏ (3 số) + vừa (3 dòng); Android 4×2 (4 dòng) | Như P1 | P2 + iPhone lớn 4×4 (6 đến 8 dòng, nhóm có tiêu đề) + màn hình khoá (tròn, chữ nhật 2 dòng, chữ nhỏ) + Android 4×4 |
| Nhìn | Nhãn loại việc có biểu tượng, một dòng mỗi việc | Nhỏ: vòng tiến độ "xong 4/10" + 3 ô số lớn (Trễ đỏ, Giao xanh, Trả cam). Vừa: dải 3 ô số + 2 dòng việc (mỗi việc 2 dòng: nhãn, tên, Hôm nay / Trễ N ngày; tên món đầu (+N), Chưa soạn đồ). Android 3 dòng | P2 + nhóm có tiêu đề (biểu tượng + số lượng), mỗi dòng một hàng; khoá màn hình một màu |
| Ưu | Đã chốt, nhỏ, ít lỗi | Nhìn là biết nhóm nào nhiều; có tiến độ; nhiều thông tin mỗi dòng | Thấy gần hết danh sách không cần mở app; biết số việc ngay trên màn hình khoá |
| Nhược | Ít thông tin, không có tiến độ | Vừa chỉ còn 2 dòng; nhiều màu; bật tiền/ảnh thì dòng chật | Chiếm chỗ màn hình chính; khoá màn hình nhìn thấy khi chưa mở máy nên chỉ có số; Android không có widget khoá cho điện thoại |
| Công sức | Nhỏ (đang làm) | Vừa | Lớn (lớn: vừa; khoá: vừa; Android 4×4: vừa) |
| Dữ liệu snapshot thêm | `product`, `moreCount` | + `done` (từ `doneToday.pickups/returns`, API đã trả sẵn, Android đã đọc ở `OverviewLogic.kt:155-157,380-383`, iOS `OverviewV2.swift:10`; `TodayWork` iOS hiện chưa decode `doneToday`) + `planTime` (nếu có giờ) | Như P2 (+ nhóm). Quy tắc mới: khoá màn hình không bao giờ có tên khách hay tiền |
| Ảnh món | Không | Tuỳ chọn (P2b): xem 9.3 | Không |
| API | Không | Không (ảnh: thêm field, tuỳ chọn) | Không |
| Phải quyết lại | Màu Trả (D2) | Số dòng vừa 3 → 2; ảnh; tiền (D3) | W4 (cỡ), W5 (riêng tư khoá màn hình), W3 (số dòng lớn) |
| Đề xuất | Giữ, phát hành trước | Làm ngay sau P1, không ảnh | Cỡ lớn sau P2 nếu thích; màn hình khoá để chủ shop quyết riêng |

### 9.3 Ảnh món trong widget (P2b, tuỳ chọn): giới hạn và chi phí

- Widget **không tải mạng** được đáng tin cậy. Ảnh phải do app (iOS) hoặc Worker (Android) tải sẵn, thu nhỏ ~40×40 (khoảng 3KB), lưu file trong App Group (iOS) / thư mục app (Android), snapshot chỉ ghi tên file.
- `GET /api/analytics/outlet-operations` hiện **không trả ảnh** (items chỉ có `name`, `quantity`: `route.ts:104-107`). Cần **thêm field ảnh** (additive) vào hàng việc, và `packages/database` (`db.outletOperations`) phải chọn ảnh sản phẩm: đây là thay đổi API (chỉ thêm), phải rà tương thích app cũ hai lần và thêm dòng `.agent/api-changes/LOG.md` (status `planned`): `new optional field items[].imageUrl on GET /api/analytics/outlet-operations | old iOS/Android ignore unknown keys (Not verified, đọc Codable ở TodayWork.swift:104-107 và JSON ở TodayWorkModels.kt) | none`.
- Thêm: bộ nhớ đệm ảnh (đặt tên theo hash URL, giới hạn tổng ~1MB, xoá khi đăng xuất / hết hạn), xử lý ảnh không có / lỗi (biểu tượng áo), tải khi mở app (iOS) hoặc trong Worker (Android).
- Công sức: vừa đến lớn. **Đề xuất: không làm cùng đợt P2.**

### 9.4 Cài đặt widget (chung)

Mockup: màn "Cài đặt › Widget" có "Ẩn tên khách trên widget" (đã chốt, mặc định tắt), "Hiện số tiền còn thu" (chờ D3, mặc định tắt, chỉ vai trò có quyền xem tiền; nhân viên không thấy dòng), "Cách thêm widget" (mở sheet hướng dẫn, đã chốt W11). Cảnh báo riêng tư khi bật tiền: số tiền nằm trên màn hình chính, ai cầm máy đang mở cũng thấy; iPhone làm mờ khi máy khoá; không bao giờ trên widget khoá màn hình; tắt công tắc hoặc đăng xuất thì xoá tiền khỏi dữ liệu widget.

### 9.5 Test thêm khi làm P2 và P3 (không áp dụng cho P1)

- Snapshot: `done` đúng (`doneToday` thiếu thì 0, "Xong hết" chỉ khi tổng xong ≥ 1 và còn lại 0); `product` + `moreCount` đúng cho đơn một món và nhiều món; `planTime` rỗng khi đơn không có giờ; công tắc tiền TẮT thì JSON không có `amountDue`; khoá màn hình không có tên và tiền.
- Ảnh chụp thật (xem `plan.md`): P2 nhỏ + vừa, tối và sáng, các trạng thái; P3 lớn và màn hình khoá trên Simulator iOS 16 trở lên.

## Out of scope

- Ghim từng đơn (A2, để việc sau); widget màn hình khoá; widget lớn; bố cục riêng cho iPad; chọn chi nhánh riêng cho widget.
- iPhone tự làm mới khi chưa mở app (cần cách xác thực an toàn cho extension); thông báo đẩy.
- Mọi thay đổi API, migration, web.
- Đồng bộ lịch hệ thống (phần 2): chưa làm, chờ widget xong.

## Acceptance (phần widget)

- [ ] Mỗi dòng ở mục 4 có test, lệnh, hoặc ảnh chụp được nêu trong `plan.md`
- [ ] iOS và Android cùng chữ, thứ tự, trạng thái; iOS là chuẩn
- [ ] Chuỗi mới có ở `en` và `vi-VN` (iOS), `values` và `values-vi` (Android); không có chuỗi mới ở `locales/*` của web
- [ ] Ngày VN, `CANCELLED` không vào Việc cần làm (API đã loại), không tiền / SĐT trong dữ liệu widget
- [ ] Có ảnh chụp thật từ Simulator iOS và emulator Android (xem `plan.md`)
