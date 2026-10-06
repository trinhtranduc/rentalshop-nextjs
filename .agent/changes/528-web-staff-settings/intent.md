# Intent — #528 Shop web Thông báo, Nhân viên, Cài đặt, dark mode

Issue: #528 · Part of the shop web redesign (boards `Thong-bao`, `Nhan-vien`, `Cai-dat`, `Main-toi`, `Don-hang-toi`)

## What

- Thông báo: the panel under the bell and `/notifications`, grouped by Vietnam day, read / mark read / mark all.
- Nhân viên (`/users`): staff table with outlet chips, role tags, last sign-in, and a "Vai trò làm được gì" card.
- Cài đặt cửa hàng (`/settings`): tab list on the left, one card per tab on the right, in the shop shell.
- The light / dark switch is on; shared dialogs follow the dark theme inside the shell.

## Why

These were the last screens still drawn with the old light-only shadcn parts, so the shell looked half new.

## Constraints

- UI only, existing calls: `/api/notifications`, `GET /api/users`, `PUT /api/settings/merchant | outlet`, `PUT /api/users/profile`, `POST /api/auth/change-password`, `GET /api/outlets`, `PUT /api/outlets/{id}` (receipt note), subscription status. No API change.
- Same tabs per role as the old Settings menu; old `?tab=` ids keep working; `loyalty` moves to `/loyalty`.
- `packages/ui` is not edited (admin keeps the old components). Bank accounts and the billing panel reuse the shared sections inside `.ar-legacy`.
- `NEXT_PUBLIC_ENABLE_THEME_SWITCH`: unset = switch shown; `false` hides it (kill switch).
- New strings in `locales/{en,vi}/{users,settings}.json` under `web`.
