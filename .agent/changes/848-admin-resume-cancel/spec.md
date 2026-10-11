# Spec
- Suspend calls `POST /pause`, which sets `PAUSED` (there is no `SUSPENDED` status). `POST /resume` accepts `PAUSED` or `CANCELLED` and returns the subscription as `ACTIVE`.
- Detail page buttons by status (case-insensitive): Suspend = ACTIVE; Cancel = ACTIVE or TRIAL; Resume = PAUSED only (resuming a CANCELLED one is not asked for; the cancel dialog says it cannot be undone).
- Resume opens the same ConfirmationDialog, calls `subscriptionsApi.resume` (exists in `packages/utils`), toasts, reloads the subscription.
- Strings stay English like the rest of the page (the page uses no locale namespace).
