# Spec — #510 Shop web login and sign-up in the 4A dotted style

Issue: #510 · Status: accepted · Intent: ./intent.md

## Behavior

1. `LoginForm` and `RegisterForm` accept `appearance?: 'classic' | 'shop'` (default `'classic'`). With `'classic'`, the rendered output is the same as before.
2. The client `/login` passes `appearance="shop"`. The page has:
   - a white page with a dotted grid (`#E2E8F0`, 1px dots on an 18px grid, 520px tall) that fades out downward;
   - a 72px brand mark with "AnyRent" in weight 800;
   - the heading "Xin chào" and the subtitle "Đăng nhập để vào cửa hàng của bạn.";
   - Google sign-in, when configured;
   - Email and Mật khẩu fields: 52px tall, 12px radius, a 1.5px blue border and a 3px light-blue ring on focus;
   - "Quên mật khẩu?" right-aligned under the password field;
   - a 54px primary button;
   - "Chưa có cửa hàng? Tạo cửa hàng mới";
   - footer links: Điều khoản, Bảo mật, and the language switcher.
3. The client `/register`, including the `step-1` and `step-2` routes, shows the same dotted page and logo. Above the form it shows "Bước 1/2" or "Bước 2/2" and the existing step title. Fields and buttons use the same input and button style as login.
4. Errors, loading states, the Google button and every validation message work exactly as before.
5. The fonts are Be Vietnam Pro on these pages only.

## Out of scope

- Forget and reset password pages.
- Any change to the auth API or to token storage.
- Dark mode on auth pages. The boards are light only.

## API and data

None.

## Acceptance

- [ ] 1: the admin `/login` and `/register` render unchanged (admin passes no prop)
- [ ] 2 and 3: screenshots at 1440px and 390px compared with the boards
- [ ] New strings `login.welcome`, `login.shopSubtitle`, `login.noShop`, `login.createShop` and `register.stepOf` exist in all five locales
- [ ] Lint, type-check and the client build are green
