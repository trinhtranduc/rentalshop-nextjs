# Plan — app đăng ký quốc gia / ngôn ngữ / tiền tệ

Status: accepted

1. Test trước (fail): iOS `POS ADBDTests/AuthFormsTests.swift` (+ test Cài đặt nếu có model) — mặc định, đổi nước, payload,
   tên tiếng Anh, danh sách 249 / VN đầu / tìm; Android `app/src/test/.../AuthFormsTest*` tương tự.
2. iOS: `Model/AuthForms.swift` (RegisterDraft / RegisterRequest), `Library/Services/AuthenticationService.swift` (body),
   `Viewcontrollers/Auth/v2/RegisterStoreV2ViewController.swift` (UI + màn chọn nước), Cài đặt `ShopInfoViewController.swift`,
   `TabsV2APIService.swift`, chuỗi `en.lproj` / `vi-VN.lproj`.
3. Android: `domain/auth/AuthForms.kt`, `data/ApiParity.kt`, `ui/auth/v2/AuthV2Screens.kt`, `ui/settings/v2/ShopInfoScreens.kt`,
   `strings.xml` (values, values-vi).
4. Verify: unit test cả hai app, `xcodebuild` Development, `./gradlew :app:assembleDebug`, e2e trên Simulator và emulator
   (có cửa sổ) với API local `:3192`: đăng ký Mỹ → DB `United States|en|USD|<múi giờ máy>`; Cài đặt đổi ngôn ngữ email.
