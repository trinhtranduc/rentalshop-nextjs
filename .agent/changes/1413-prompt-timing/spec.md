# Spec: prompt timing

Issue: #1413 · Status: in-review

No API path changes. Only `apps/mobile` and `apps/mobile-android`.

## Rating (iOS)

`RatingPromptRule.shouldRequest(alreadyRequested:orderTotal:guideMarks:coachRunning:)`:

- false once `hasRequestedAppRating` is set; the order total is not read again after that
- false on a nil total (network failure): no prompt, no error, nothing stored
- false below 5 orders
- false while a guide run is in progress
- false while the finish card is pending, or would be once this total reaches the guide

`RatingManager.requestRatingIfNeeded` keeps its signature, so the call sites in the cart and the old checkout do not change. Apple decides whether the sheet appears.

## Notification permission

iOS `PushNotificationManager.start()` stops asking. It sets the delegates and, if the permission is already allowed, calls `registerForRemoteNotifications` as before. notDetermined and denied do not register, same as the `guard granted` of today.

Home's `viewDidAppear` (new and old Home) asks when: status notDetermined, signed in, onboarding done, Home in front (tab 0, root of its stack, nothing presented), app not blocked by the minimum version.

Android `MainActivity.onCreate` stops asking. `MainTabs` asks with Home in front when: SDK 33+, not granted, onboarding done, not asked before on this install, and no rationale flag (a user who declined on an older version already answered). `PushRegistrar` is not touched: the FCM token does not depend on this permission.

| Entry | Result |
|---|---|
| Login, onboarding pending | Onboarding, no prompt; Home after it asks |
| Login, onboarding done | Home asks if never answered |
| Register | Ends at "check email"/login, no main UI, no prompt; then as login |
| Relaunch logged in, onboarding pending | Onboarding, no prompt |
| Relaunch logged in, Home | Asks only if never answered |
| Push tap | Permission already answered, no prompt. iOS `forceMain` with onboarding pending: no prompt |
| Widget link | iOS `forceMain` with onboarding pending: no prompt; Android waits for onboarding. Todo tab: no prompt until Home shows |
| Logout, login | Token registration as today; answered, so no prompt |
