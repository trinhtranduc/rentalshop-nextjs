# Spec — timezone batch E (#578 spec §E)

Day = VN civil day key. VN midnight = 17:00:00Z of the previous UTC day.

E1. `civilDaysBetween(from, to)` = VN day key of `to` minus VN day key of `from`, in days. Used for:
    `subscriptions/status` daysRemaining / daysLeft / daysExpired, `calculateProration` daysRemaining and
    daysInPeriod, `calculatePlanChangeTotal` / `calculateExtensionTotal` day counts, `subscriptions/[id]/extend`
    extensionDays. While the period is active `daysRemaining >= 0`; `isExpiringSoon` = active and `daysRemaining <= 7`
    (0 = expires today). Same answer at any hour of the VN day, under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
E2. `addMonthsInTimeZone(instant, months)` adds calendar months to the VN wall time and clamps the day:
    31 Jan + 1 = 28 Feb (29 Feb 2028), 31 Mar + 1 = 30 Apr, 29 Feb 2028 + 12 = 28 Feb 2029, negative months allowed;
    the VN clock time is kept (Jan 31 00:00 VN + 1 = Feb 28 00:00 VN = 2026-02-27T17:00Z).
    Callers: `payments/manual`, `admin/subscriptions/[id]/extend`, `subscriptions/[id]/renew`,
    `webhooks/revenuecat` (sandbox / fallback expiry), `lemonsqueezy/webhook` (approximate period start),
    `calculateExtensionTotal` (selected interval length).
E3. Subscription emails (plan change, renewal, extension, expiry reminder, status change) format dates with
    `timeZone: Asia/Ho_Chi_Minh`. Extend activity text and expiry-reminder activity text use the VN day key.
E4. `isYearlyResetDate(program, now)` compares the VN month/day of `now`.
    2025-12-31T17:05Z with reset 1/1 → true; 2025-12-31T16:59:59Z → false; 2026-01-01T17:00:00Z → false.

Unchanged: request/response shapes, stored instants of existing rows, which subscriptions are ACTIVE/EXPIRED
(`periodEnd < now`).
