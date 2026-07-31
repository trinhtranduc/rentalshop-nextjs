# AnyRent Android POS

Native Android POS app (Kotlin + Jetpack Compose) for AnyRent, parallel to iOS `apps/mobile`.

## Stack

- Kotlin, Jetpack Compose, Navigation, Material 3
- OkHttp API client (same backend as iOS)
- Firebase Cloud Messaging (`platform=android`)
- `:shared` Android library — extraction point for future KMP common logic

## Setup

1. Open `apps/mobile-android` in Android Studio.
2. Replace `app/google-services.json` with the real Firebase Android app config for package `com.anyrent`.
3. Sync Gradle / run on emulator or device.

```bash
cd apps/mobile-android
./gradlew :app:assembleDebug
```

- Debug API: `https://dev-api.anyrent.shop`
- Release API: `https://api.anyrent.shop`

## Features (by plan phase)

| Phase | Coverage |
|-------|----------|
| 0 | Project shell, session, networking, roles, FCM channel + backend android payload |
| 1 | Login, forgot/check-email, register store, onboarding, FCM, inbox, settings |
| 2 | Orders list/filter, detail lifecycle (status/ready/QR/print/delete), notes, payment, camera order scan |
| 3 | Home catalog, full cart checkout (dates/discount/deposit/collateral/notes), create order, camera barcode, product create |
| 4 | Customers CRUD (+ pick for cart) |
| 5 | Calendar month view, overview period chips + metrics/growth + rankings |
| 6 | Store info edit, users CRUD, authenticated export share, thermal network print (ESC/POS), app info links |
| 7 | Offline product/order cache, `:shared` module for future KMP |

### Explicitly out of scope (per product decision)
- AI image search
- Label printing

## Notes

- UI permission helpers only hide controls; data scoping stays on the API.
- Replace `app/google-services.json` with the real Firebase Android config for package `com.anyrent`.
- Thermal print uses network IP:port (default 9100), same model as iOS `PrinterManager`.
