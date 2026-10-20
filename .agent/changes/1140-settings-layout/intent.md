# Settings layout C

Issue: #1140 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-20

## Problem

Web Cài đặt for the owner: "Thông tin cửa hàng" scrolls ~2.6 screens; logout and delete account hide under "Đổi mật khẩu"; language and theme are two tabs; the phone shows a 9-pill horizontal strip.

## Proposed outcome

Owner-approved layout C (mockup "C · Tách thêm: 8 mục, 3 nhóm"): 3 groups (Cửa hàng · Tài khoản · Tôi), 8 sections for the owner, 6 for OUTLET_ADMIN, 5 for OUTLET_STAFF / OUTLET_INVENTORY. Phone: grouped list, row → page with back.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY on `apps/client`. No API, no mobile.

## Constraints

Moves only: every option reachable, same calls, same saves. Old `?settings=` keys keep working. Currency auto-sync untouched (separate bug). Simple, fewer words.
