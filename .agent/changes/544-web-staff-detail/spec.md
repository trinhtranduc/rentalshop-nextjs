# Spec — #544 Thêm nhân viên and staff detail

Issue: #544 · Status: accepted · Intent: ./intent.md

## Thêm nhân viên (`/users/add`)

1. OUTLET_STAFF (any role other than ADMIN / MERCHANT / OUTLET_ADMIN) sees the no-access note; no request.
2. Back link "‹ Nhân viên" → `/users`; title "Thêm nhân viên".
3. Card **Thông tin**: Họ và tên, Email đăng nhập (required; placeholder `<tenantKey>_` when the shop key is
   known, as before), Số điện thoại (optional).
4. Card **Vai trò và chi nhánh**: two radio cards Quản lý chi nhánh / Nhân viên with what each can do
   (default Nhân viên). Merchant: outlet chips from `GET /api/outlets` (required). Outlet admin: their outlet,
   read-only, sent automatically.
5. Card **Mật khẩu đăng nhập**: Mật khẩu + Nhập lại, each with Hiện / Ẩn; login note.
6. Checks on submit (`validateStaffForm`, old order and rules): name's first word ≥ 2 characters when given;
   email required + `\S+@\S+\.\S+`; phone optional, 8–15 digits, only `+ digits space - ( )`; role required;
   outlet required for outlet roles; password required, ≥ 6; confirm required, equal. Errors under the field.
7. Submit → `usersApi.createUser` with first word as `firstName`, rest as `lastName`, email trimmed +
   lower-case, phone trimmed or omitted, `merchantId`, `outletId`. Success toast, then `/users/<id>`.
   API errors: global toast.

## Staff detail (`/users/[id]`)

8. OUTLET_STAFF: no-access note. Bad id / not found: "Không tìm thấy nhân viên" + link to the list.
9. Header: avatar, name, role tag, status pill (Đang hoạt động / Đã khoá); buttons Đổi mật khẩu, Sửa.
10. Card **Thông tin**: Họ và tên, Email (mailto), Số điện thoại (tel or —), Vai trò, Chi nhánh (+ address),
    Cửa hàng.
11. Card **Tài khoản**: status hint, Khoá tài khoản / Mở khoá tài khoản, Email (đã / chưa xác thực), Đăng nhập
    gần nhất, Ngày tạo (Vietnam time), Xoá nhân viên. Lock / unlock / delete hidden on an ADMIN row and on
    yourself (`canManageRow`, same as the list); each asks first; delete returns to `/users`.
12. **Sửa** dialog: Họ và tên, Email (read-only), SĐT, Vai trò (read-only, as before), Chi nhánh (merchant:
    chips; outlet admin: read-only). Same checks as 6 minus passwords. → `usersApi.updateUserByPublicId`;
    success toast, page refreshes.
13. **Đổi mật khẩu** dialog: Mật khẩu mới, Nhập lại; checks new required (trimmed), ≥ 6, confirm required,
    equal → `usersApi.changePassword(id, newPassword)`; success toast.

## Shared

14. Light and dark only through `ar-*` tokens; 390px has no horizontal scroll; dialogs are the shell `Modal`.
15. The list's "Sửa" / name links (`/users/<id>`) and "Thêm nhân viên" (`/users/add`) keep working.

## Out of scope

Permission pages (#542). Changing roles of existing staff (old UI did not offer it).

## API and data

None changed. Numeric ids only.

## Acceptance

- [ ] `tests/web-users-form.test.ts` (both TZ) for `staff-form-model.ts`
- [ ] tsc: no new errors in `app/users/**`; eslint clean
- [ ] Browser: merchant adds a staff user, opens detail, edits, locks / unlocks; outlet admin sees only own
      outlet; light + dark, 1440 + 390; 0 page errors
- [ ] Strings in `locales/{en,vi}/users.json` → `web.form`, `web.detail`, `web.password` (ja/ko/zh have no
      `web` block)
