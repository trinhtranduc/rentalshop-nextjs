# Plan

1. Sửa mock; chạy `cd tests && TZ=UTC yarn test product-deleted-filter` và `TZ=Asia/Ho_Chi_Minh`.
2. Xoá file rỗng.
3. Sửa 2 khẳng định trong `AnyRentE2ETests.swift`.
4. Chạy toàn bộ `yarn test`, xác nhận hai suite không còn trong danh sách fail.
5. PR vào `dev`, `Fixes #1281`.
