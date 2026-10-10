# Spec

- #758 Android `ApiErrorMessages.stringId` maps SUBSCRIPTION_{EXPIRED,PAUSED,CANCELLED,PAST_DUE,PERIOD_ENDED},
  NO_SUBSCRIPTION, PLAN_LIMIT_EXCEEDED, PLAN_UPGRADE_REQUIRED, PLATFORM_ACCESS_DENIED,
  CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET, NO_OUTLET_ACCESS, ORDER_NOT_FOUND (wording of `locales/*/errors.json`);
  any other SUBSCRIPTION_* / PLAN_* / TRIAL_* code shows a generic localized sentence.
  iOS: `APIErrorText.message(forCode:)` reads `Localizable.strings` by code, the same generic fallback; keys added in en and vi-VN.
- #756 the product form keeps the error of the outlet-list call and shows it when no outlet can be chosen (iOS and Android).
- #757 a "Collected" row's reason comes from `revenueType` (and the known API sentence, which also splits a `MULTIPLE`
  row "a + b"); `RENT_RETURN` falls back on the sign of the amount; an unknown type keeps `description`.
  iOS `RelatedEventReason`, Android `EventReason`, web `eventReasons` + `home.related.event.*`.
- #767 Android inbox: long press opens "Mark unread / read" and "Delete" (`PATCH /api/notifications/:id/unread`, `/read`).
