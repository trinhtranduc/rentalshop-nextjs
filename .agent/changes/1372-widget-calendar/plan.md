# Plan — Widget "Việc cần làm" (làm trước) và đồng bộ lịch hệ thống (làm sau)

Issue: #1372 (docs: #1373) · Status: widget accepted (2026-10-31); lịch hệ thống chờ · Spec: ./spec.md

Mỗi PR code mở issue con riêng (`issue-first`), `Refs #1372`, nhánh `feat/<issue>-<slug>` từ `origin/dev`, PR vào `dev`, thân tiếng Việt. Gom UI nhỏ của một nền tảng vào một PR nhiều commit.

## Thứ tự PR

| PR | Nội dung | Phụ thuộc | Trạng thái |
|---|---|---|---|
| **PR-1 iOS widget** | App Group, dữ liệu widget, widget nhỏ + vừa, trạng thái, deep link, thẻ gợi ý + sheet hướng dẫn, công tắc Ẩn tên, chuỗi en + vi-VN, test. **Không có API** (spec mục 6). | Chủ shop đăng ký App Group + provisioning (trước TestFlight; Simulator không cần) | sẵn sàng code |
| **PR-2 Android widget** | Glance + WorkManager, widget 4 dòng, trạng thái, nút `requestPinAppWidget`, thẻ gợi ý, công tắc Ẩn tên, chuỗi `values` + `values-vi`, test. Chữ, thứ tự, trạng thái theo iOS. | PR-1 đã merge (iOS là chuẩn) | sau PR-1 |
| PR-3 Lịch hệ thống (B1) | **Chưa làm, chờ widget xong, chưa chốt L1 và L2.** Nút "Thêm vào lịch" iOS + Android. | PR-1, PR-2, chủ shop chốt L1 L2 | chờ |

## PR-1 iOS widget: các bước

1. **Issue con**, rà tương thích lần 1 ("No API change"), intent/spec/plan đã có ở thư mục này.
2. **Test trước** (`test-driven-development`): logic dữ liệu widget (mục "Test").
3. **Mô hình dữ liệu dùng chung** trong static lib Swift 5 `apps/mobile/DraftOrderActivity/` (app Swift 4 gọi qua cầu, như `DraftOrderLiveActivityBridge`): `TodayWidgetSnapshot.swift` (Codable theo spec mục 5, hàm `isFresh(now:)` theo ngày VN, hàm dựng "kind/rows/counts" thuần), `TodayWidgetStore.swift` (đọc/ghi file JSON trong App Group), `TodayWidgetBridge.swift` (public API cho app: `write(...)`, `clear()`, `reload()`).
4. **Dựng dữ liệu từ app:** hàm thuần trong `ViewModels/` dùng `OrdersHomeLogic.todaySections(from:)` và `workChips`/`LateText.days` (`OrdersHomeViewModel.swift:302,427-453`), cắt 8 dòng, không tiền, không SĐT, tôn trọng công tắc Ẩn tên.
5. **Móc ghi dữ liệu:** sau khi tải Việc cần làm thành công (`OrdersHomeViewModel.swift:859-866`) và 403 (`:867-872`, state `noAccess`); mở app (foreground); đổi chi nhánh (`CurrentOutlet`); sau tạo / lấy / trả / huỷ đơn. **Xoá** ở `User.reset()` (`Model/User.swift:276-283`) và khi phiên hết hạn. Mỗi lần ghi gọi `WidgetCenter.shared.reloadAllTimelines()`.
6. **Widget:** thêm `TodayWorkWidget` vào `AnyRentLiveActivityBundle` (`AnyRentLiveActivityBundle.swift:6-8`), `systemSmall` + `systemMedium`, `TimelineProvider` chỉ đọc file (không mạng): entry hiện tại + entry tại nửa đêm VN (đổi sang "Cũ"), policy `.after(now + 30 phút)`. Tên khách `.privacySensitive()`. Chữ lấy từ `labels` trong dữ liệu.
7. **App Group:** `APP_GROUP_ID` trong build settings (`group.com.anyrent`, debug dùng chung), entitlement `com.apple.security.application-groups` cho app (`POS ADBD.entitlements`, `project.pbxproj:2495,2576`) và một file entitlements mới cho extension `AnyRentLiveActivity`; khoá `AnyRentAppGroup` trong `Info.plist` hai bên để đọc lúc chạy. Cập nhật `scripts/patch_live_activity_pbxproj.py` hoặc sửa `project.pbxproj` đúng cách script đó làm; kiểm `git diff` pbxproj chỉ có phần cần.
8. **Deep link:** `AppDelegate.application(_:open:)` (`AppDelegate.swift:20-26`) tách theo host: `order/<id>` mở chi tiết đơn, `todo` mở tab Đơn hàng mục Việc cần làm, còn lại giữ "mở giỏ nháp" (Live Activity). Cần xử lý khi app chưa đăng nhập và khi app đang lạnh (đợi giao diện sẵn sàng).
9. **Thẻ gợi ý + sheet:** thẻ ở đầu danh sách mục Việc cần làm (`OrdersViewController.swift`), điều kiện theo spec mục 4.13; sheet hướng dẫn 3 bước; dòng "Widget" ở Cài đặt; công tắc "Ẩn tên khách trên widget". Cờ "Không hỏi lại" ở `UserDefaults.standard`. Phát hiện đã có widget: `WidgetCenter.getCurrentConfigurations`.
10. **Chuỗi:** `en.lproj` và `vi-VN.lproj/Localizable.strings` (skill `i18n-keys`/`mobile-parity` bước 3). Nối chuỗi bằng `cat >>` rồi `wc -l` (không `open(p,"w")` trước khi đọc).
11. `mobile-parity`: ghi vào PR rằng Android làm ở PR-2, theo cùng chữ.
12. Thêm một dòng ở `AGENTS.md` "Things agents get wrong" **chỉ nếu** có lỗi lặp lại (không làm trước).

## PR-2 Android widget: các bước

1. Issue con. Thêm vào `app/build.gradle.kts`: `androidx.glance:glance-appwidget` (bản ổn định, ghim phiên bản cụ thể) và `androidx.work:work-runtime-ktx`.
2. Mô hình thuần `domain/widget/TodayWidgetState.kt` (cùng quy tắc spec mục 4: đếm, thứ tự, 4 dòng, "+N", trạng thái, ngày VN `ZoneId.of("Asia/Ho_Chi_Minh")`, không tiền/SĐT) + test JUnit trước.
3. `TodayWorkWidgetReceiver` / `TodayWorkWidget` (Glance), khai báo `AppWidgetProviderInfo` (`res/xml`, tối thiểu 4×2, `resizeMode`), thêm vào `AndroidManifest.xml`. Chạm dòng: `actionStartActivity` với `anyrent://order/<id>` (đã chạy, `MainActivity.kt:58-61`); chạm đầu widget: URL `anyrent://todo` (thêm xử lý ở `MainActivity` mở tab Đơn, Việc cần làm).
4. `TodayWorkWidgetWorker` (WorkManager, định kỳ 30 đến 60 phút + một lần khi app vào foreground + nút ↻): dùng `DefaultTodayWorkRepository` / `ApiClient` + `SessionStore` (cùng tiến trình, refresh một lần một). Xác nhận `ApiClient.get()` chạy được khi không có Activity (Not verified, kiểm ở bước này). Chưa đăng nhập → trạng thái đăng nhập, không gọi mạng. Lỗi mạng → giữ dữ liệu cũ, không báo ngày hôm qua như hôm nay.
5. Xoá dữ liệu widget khi đăng xuất (chỗ `SessionStore` clear) và cập nhật widget.
6. Thẻ gợi ý + sheet ở `ui/orders/v2/OrdersHomeScreen.kt`; nút "Thêm widget" gọi `AppWidgetManager.requestPinAppWidget(provider, null, callbackPendingIntent)` nếu `isRequestPinAppWidgetSupported()`, ngược lại sheet 3 bước; dòng "Widget" ở Cài đặt; công tắc Ẩn tên. Cờ "Không hỏi lại" trong SharedPreferences.
7. Chuỗi `res/values/strings.xml` và `res/values-vi/strings.xml`. Không thêm quyền (WorkManager tự thêm `RECEIVE_BOOT_COMPLETED`).
8. `./gradlew :app:assembleDebug` và `:app:testDebugUnitTest`.

## Test

**Logic (chạy tự động, không cần máy):**

- iOS (`apps/mobile`, thêm vào test target hiện có): dựng dữ liệu từ `TodayWork` mẫu → đúng đếm (Trễ không đếm vào Giao/Trả), thứ tự Trễ → Giao → Trả, tối đa 8 dòng, không có tiền / SĐT trong JSON đã mã hoá, công tắc Ẩn tên xoá tên; `isFresh` ở `2026-10-31T16:59:59Z` (vẫn 31/10 VN) và `T17:00:00Z` (đã 01/11 VN → "Cũ"), cho `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`; 403 → `noAccess`; đăng xuất → không còn file; API cũ không có `tomorrow*` → không có "Mai có…".
- Android: cùng bộ ca trên cho `TodayWidgetState` (JUnit), cộng test worker bằng `TestListenableWorkerBuilder` (không mạng, repository giả).
- Chữ khớp tab Việc cần làm: so chuỗi nhãn với `orders.v2.notPrepared`, `LateText.days`.

**Trên máy thật (hiển thị cho chủ shop thấy: cửa sổ Simulator / emulator, theo AGENTS.md):**

iOS Simulator (widget chạy thật được trên Simulator, kể cả khi chưa đăng ký App Group; App Group hoạt động trên Simulator):

1. Theo skill `mobile-e2e-local`: seed DB riêng, API local, `open -a Simulator` với máy iPhone ở phía trước, build scheme `Development` (`xcodebuild … -destination 'generic/platform=iOS Simulator'`) và cài.
2. Đăng nhập tài khoản seed, mở tab Đơn hàng một lần (app ghi dữ liệu). Chụp thẻ gợi ý (`xcrun simctl io booted screenshot`).
3. Thêm widget bằng giao diện: Home (Cmd+Shift+H), giữ lâu màn hình chính, bấm +, chọn AnyRent, thêm cỡ nhỏ rồi cỡ vừa; chụp màn hình chính sáng và tối (`xcrun simctl ui booted appearance dark`). Có thể tự động hoá bằng XCUITest điều khiển SpringBoard (`XCUIApplication(bundleIdentifier: "com.apple.springboard")`), nhưng dễ vỡ giữa các bản iOS nên chỉ là tuỳ chọn; bắt buộc có ảnh chụp.
4. Các trạng thái: có việc (seed có đơn giao, trả, trễ); trống (chi nhánh/tài khoản seed không có việc); đăng xuất (widget về "Mở AnyRent để đăng nhập"); không quyền; bật Ẩn tên.
5. Chạm: chạm một dòng → mở đúng đơn (`xcrun simctl openurl booted anyrent://order/<id>` kiểm riêng deep link, kể cả khi app chưa chạy); chạm đầu widget → Việc cần làm.
6. Ngày mới: Simulator không đổi giờ dễ dàng, nên mục "qua nửa đêm" kiểm bằng test logic (bước Test), và có thể kiểm tay bằng cách đổi giờ máy Mac/Simulator rồi mở lại màn hình chính.
7. Xcode: chạy scheme `AnyRentLiveActivity` để xem timeline (tuỳ chọn). iOS 15: không có widget (extension nhắm 16.1), app vẫn chạy; thẻ gợi ý **không** được hiện trên máy này (Not verified, thử trên Simulator iOS 15 nếu có).

Android emulator (AVD có cửa sổ, không `-no-window`):

1. `./gradlew :app:assembleDebug`, `adb install`, đăng nhập tài khoản seed (API local), mở tab Đơn một lần.
2. Thêm widget bằng launcher: giữ lâu màn hình chính, Widgets, AnyRent, kéo ra (điều khiển bằng `adb shell input` + `uiautomator dump` để tìm toạ độ), hoặc bấm nút "Thêm widget" trong app (hộp thoại `requestPinAppWidget`). Chụp bằng `adb exec-out screencap -p`.
3. Đọc nội dung widget bằng `adb shell uiautomator dump` rồi tìm các chữ ("Giao", tên khách, "Chưa soạn đồ") trong cây giao diện của launcher (Not verified: phụ thuộc launcher của AVD).
4. Làm mới: bấm ↻; chạy Worker bằng `adb shell cmd jobscheduler run -f <package> <jobId>` (jobId lấy từ `dumpsys jobscheduler`, Not verified) hoặc dựa vào test `TestListenableWorkerBuilder`.
5. Cùng các trạng thái như iOS; đối chiếu ảnh iOS và Android cạnh nhau để kiểm "giống chữ, giống thứ tự".

Báo cáo ghi con số và đường dẫn ảnh (`.agent/changes/<issue>-.../shots/`), như các thư mục khác.

## Files (dự kiến)

iOS: `apps/mobile/DraftOrderActivity/TodayWidget*.swift` (mới), `apps/mobile/AnyRentLiveActivity/TodayWorkWidget.swift` (mới) + `AnyRentLiveActivityBundle.swift`, `AnyRentLiveActivity/*.entitlements` (mới), `POS ADBD/POS ADBD.entitlements`, `Info.plist` (hai bên), `project.pbxproj`, `Application/AppDelegate.swift`, `ViewModels/OrdersHomeViewModel.swift`, `Viewcontrollers/Orders/OrdersViewController.swift`, `Model/User.swift`, `en.lproj` + `vi-VN.lproj/Localizable.strings`, test.
Android: `app/build.gradle.kts`, `AndroidManifest.xml`, `res/xml/today_work_widget_info.xml`, `domain/widget/*`, `ui/widget/*`, `ui/orders/v2/OrdersHomeScreen.kt`, `MainActivity.kt`, `res/values*/strings.xml`, test.
Không đụng: `apps/api`, `packages/`, `prisma/`.

## Risks

- **App Group và token dùng chung (lớn nhất):** không đưa refresh token ra Keychain access group. Refresh token đổi mỗi lần refresh (`AuthSession.swift:87`), access token sống 1 giờ (`ApiClient.kt:82`): extension tự refresh sẽ đua với app và có thể đăng xuất cả máy. Vì vậy extension **chỉ đọc file dữ liệu**, không giữ token, không gọi mạng. File dữ liệu không chứa token, tiền, SĐT.
- **Provisioning:** App Group phải được đăng ký và 4 bundle id phải có profile mới trước TestFlight; thiếu thì build ký thật lỗi hoặc widget không đọc được dữ liệu. Việc của chủ shop; nêu rõ trong PR-1. Cách ký extension hiện tại: Not verified.
- **Làm mới iOS:** WidgetKit giới hạn số lần làm mới (theo tài liệu Apple, vài chục lần mỗi ngày mỗi widget; con số cụ thể là kiến thức ngoài repo). Vì vậy widget không tự gọi mạng; làm mới theo sự kiện từ app + entry nửa đêm. Hệ quả có chủ ý: chưa mở app sang ngày mới thì widget báo "Mở app để cập nhật". Android Doze có thể làm WorkManager chậm hơn 30 đến 60 phút.
- **Riêng tư:** tên khách hiện trên màn hình chính; `privacySensitive` chỉ làm mờ khi máy khoá, không làm mờ khi máy mở: đó là lý do có công tắc Ẩn tên. Không tiền, không SĐT. Widget Android không lên màn hình khoá điện thoại. Dữ liệu widget bị xoá khi đăng xuất.
- **Deep link iOS:** handler hiện coi mọi `anyrent://` là giỏ nháp (`AppDelegate.swift:20-26`); đổi sang tách host phải giữ nguyên hành vi của Live Activity (test).
- **Swift 4 ↔ 5:** app Swift 4.0, widget và dữ liệu chung phải ở module Swift 5 và gọi qua cầu công khai; tránh kiểu Swift 5-only lọt vào code app.
- **iOS 15:** extension nhắm iOS 16.1 nên không có widget trên iOS 15; thẻ gợi ý không được hiện khi máy không dùng được widget.
- **Dữ liệu sai ngày:** luôn so ngày VN, không dùng ngày UTC (`timezone-dates`); test ở ranh giới 16:59:59Z / 17:00:00Z.
- **Hai nền tảng lệch:** iOS không tự làm mới nền, Android có; chữ và trạng thái phải giống. Ghi lệch này trong PR (theo `mobile-parity` bước 9).
- **Lịch hệ thống (sau):** quyền lịch bị từ chối (B2), sự kiện trùng khi bấm hai lần / hai máy, lịch không tự cập nhật khi đơn đổi (B1), Google làm mới `.ics` chậm (B3). Chi tiết ở spec mục 8; chưa làm.

## Rollback

Widget là thêm mới trong app, không đụng API hay dữ liệu máy chủ: bỏ `TodayWorkWidget` khỏi `AnyRentLiveActivityBundle` (iOS) / bỏ receiver khỏi manifest (Android) rồi phát hành bản sau; widget đã thêm trên máy sẽ trống. Thẻ gợi ý và dòng Cài đặt bỏ cùng PR. Không cần migration, không cần đổi API, app cũ không bị ảnh hưởng.
