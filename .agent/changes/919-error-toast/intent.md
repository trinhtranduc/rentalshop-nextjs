# Intent — #919 error toast

**What:** web error toasts (client, admin) show the title in the user's language, hide by themselves after 6 s
(close button stays), and do not stop clicks on the page around them.

**Why:** the title was the English literal `'Error'` (`useGlobalErrorHandler.ts:78`) even in Vietnamese, and error
toasts were created with duration `0`, so they stayed forever over the top-right corner and covered buttons there
(found in the attendance e2e, #906). Owner approved on 2026-10-12.

**Constraints:** no API change. Strings in all 5 locales (the existing `common.labels.error` / `labels.warning`).
Other toast types keep their behavior. Do not touch attendance files (#918).
