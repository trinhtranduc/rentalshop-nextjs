# Spec — #509 New shop web shell, light/dark theme, login and sign-up

Issue: #509 · Status: accepted · Intent: ./intent.md

## Behavior

### Shell (PR 1)

1. Signed-in pages that showed the old sidebar now render inside `ShopShell`. Public, auth, blog and `/edit` pages do not.
2. The sidebar is 248px wide on `lg` and up and contains, in order:
   - the logo and "AnyRent";
   - the shop name and the outlet name (or "Tất cả chi nhánh" for a merchant without an outlet);
   - a "Tạo đơn" link to `/orders/create`;
   - the main nav: Tổng quan `/dashboard`, Đơn hàng `/orders`, Lịch giao trả `/calendar`, Kiểm tra còn hàng `/availability`, Sản phẩm `/products`, Khách hàng `/customers`;
   - a "QUẢN LÝ" group: Nhân viên `/users`, Chi nhánh `/outlets`, Danh mục `/categories`, Khách thân thiết `/loyalty`, Cài đặt cửa hàng `/settings`;
   - a footer with initials, name, role label, and a logout button.
3. Role filtering matches `ClientSidebar` today:
   - `OUTLET_ADMIN` does not see `/outlets`;
   - `OUTLET_STAFF` sees neither `/users` nor `/outlets`;
   - `/loyalty` is `MERCHANT` only.
4. The current route's item has `aria-current="page"` and the active style. A nested route (`/orders/123`) marks its parent.
5. Below `lg`, the sidebar is hidden. A menu button in the top bar opens it as a drawer, which closes on a link click, on Escape, and on a backdrop click.
6. The top bar has:
   - a search field. Submitting it goes to `/orders?q=<text>`. The `/` key focuses it unless focus is already in an input.
   - the theme switch (see 8 to 11);
   - a bell that shows the unread count from `notificationsApi.getUnreadCount()`. There is no badge when the count is 0, and "99+" above 99. Clicking it opens a 440px panel (the Thông báo board):
     - "Tất cả" and "Chưa đọc" tabs, and a "Đã đọc hết" action that calls `markAllAsRead`;
     - the latest 20 items grouped by Vietnam civil day (Hôm nay / Hôm qua / dd/MM), unread ones bold with a blue dot;
     - clicking an item marks it read.
     The panel closes on Escape or an outside click.
7. Inside the shell the font is Be Vietnam Pro. Public pages keep Inter.

### Theme (PR 1)

8. Light and dark token sets are CSS variables on `:root` and `.dark`. The `.dark` set is used only when the `dark` class is on `<html>`.
9. With no saved choice, the theme follows `prefers-color-scheme` and changes live when the OS setting changes.
10. Clicking the switch toggles light and dark and saves the choice in `localStorage['anyrent-theme']`. The saved value wins over the OS on the next load.
11. An inline script in `<head>` sets the class before first paint, so a dark user sees no white flash.
12. The switch renders only when `NEXT_PUBLIC_ENABLE_THEME_SWITCH === 'true'`. While it is hidden, the theme is always light, even if the OS is dark.

### Login and sign-up (PR 2)

13. `/login` and `/register` use the 4A layout:
    - a dotted background fading downward;
    - a 72px logo, "AnyRent", and a heading;
    - fields with a blue focus ring.
    The login, Google login, register steps and validation logic are unchanged.
14. `apps/admin` `/login` renders exactly as before.

## Out of scope

- Redrawing pages inside the shell (phases 2 to 7).
- A working outlet switcher. Phase 1 shows the outlet name only; switching comes with Tổng quan (phase 2).
- A full-page notification list and per-type deep links. Phase 7 handles both.
- Any API change.

## API and data

Reads `GET /api/notifications` through `notificationsApi.getNotificationsPaginated(1, 1)`. No new fields. User, merchant and outlet names come from `useAuth().user`.

## Acceptance

- [ ] 1 to 7: a manual check on dev, plus the screenshots in the PR at 1440px and 390px
- [ ] 3: a unit test of the nav filter for each role
- [ ] 9 to 11: a unit test of `resolveTheme(saved, prefersDark, enabled)`, plus a manual reload check in dark mode
- [ ] 6: a unit test of the day grouping under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [ ] No API shape or business-rule change, so no mobile change
- [ ] New strings in en, vi, ja, ko, zh (`common.json` `shell.*`)
- [ ] `yarn lint`, the client type-check and the client build are green; `apps/admin` builds unchanged
