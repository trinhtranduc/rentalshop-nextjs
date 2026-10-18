# Jest: 2 test chưa cập nhật theo #986/#987

Issue: #1052 · Author: Trinh Tran · Status: done · Created: 2026-10-18

## Problem

Trên `dev`, `tests/api/mobile-login-refresh.test.ts` (8 test) và một test trong
`tests/image-search-user-message.test.ts` fail. Code đúng; test cũ. Release #1049 bị chặn ở cổng Jest.

## Proposed outcome

Hai bộ test pass ở `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`, vẫn kiểm tra đúng hành vi cũ (#344, #660) và hành vi mới (#986, #987).

## Affected users and systems

Chỉ `tests/`. Không app, không API, không dữ liệu.

## Constraints

Không sửa code sản phẩm. Không bỏ hay nới assertion nào.

## Decision log

- 2026-10-18 — Mock `ResponseBuilder.success` gọi bản thật (`jest.requireActual`) để shape luôn khớp (agent)
