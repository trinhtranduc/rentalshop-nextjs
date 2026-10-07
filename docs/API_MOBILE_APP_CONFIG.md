# Mobile app config (`GET /api/mobile/app-config`)

Public, no token. Read by iOS and Android at launch and when the app comes back to the foreground (#365, #370).

```json
{ "success": true, "code": "APP_CONFIG_SUCCESS", "data": {
  "ios":     { "minVersion": "0.0.0", "latestVersion": "1.1.3", "storeUrl": null },
  "android": { "minVersion": "0.0.0", "latestVersion": "0.1.3", "storeUrl": "https://play.google.com/store/apps/details?id=anyrent.shop" },
  "features": { "newOrders": false, "newOrderDetail": false, "newProducts": false,
                "newCalendar": false, "newOverview": false, "newSettings": false,
                "newAuth": false, "newCustomers": false } } }
```

## Set on Railway (API service)

| Variable | Effect |
|---|---|
| `IOS_MIN_VERSION`, `ANDROID_MIN_VERSION` | Builds below this see a blocking "Update required" screen |
| `IOS_LATEST_VERSION`, `ANDROID_LATEST_VERSION` | Newest store version (informational) |
| `IOS_STORE_URL`, `ANDROID_STORE_URL` | Where the Update button goes (hidden when empty) |
| `MOBILE_FEATURES` | Unset or blank: every new screen on (#456). `none`: every new screen off. Otherwise the comma-separated screens to turn on, e.g. `newOrders,newOrderDetail` (staged rollout / kill switch) |

Defaults never force an update and turn every new screen on. Responses are cached 5 minutes.

## App behavior

- The app compares versions (`x.y.z`); the server only returns them.
- A failed call uses the last good config (kept across logouts); without one the app opens normally.
- iOS: `AppConfigService`, `FeatureFlags.shared`, `UpdateRequiredViewController`, gate in `AppDelegate`.
- Android: `DefaultAppConfigRepository`, `FeatureFlags`, `AppConfigGate` in `MainActivity` (splash waits up to 2 s).

## Rollout

1. Ship the app version that reads this endpoint.
2. New screens are on by default. For a staged rollout set `MOBILE_FEATURES` to a list (or `none`)
   before the API reaches an environment, then widen it.
3. Raise `*_MIN_VERSION` only when most active devices run a version that has the needed screens
   (request logs carry `X-App-Version`).
