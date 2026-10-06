# Spec — #537

1. **Nhân viên**: totals come from `pagination.total` of `GET /api/users`. The page reads the raw JSON through
   `authenticatedFetch` (query built by `staffQuery`, same parameters as `usersApi.searchUsers`), because
   `parseApiResponse` drops `pagination`. Outlet chips show the real head-count; paging works past 20.
   `packages/utils` is not changed (its `dist` is committed and admin uses it).
2. **Sản phẩm**: the category chip strip fades out over its last 32px, so a chip cut by the edge reads as "more".
3. **Khách hàng**: the phone row reads `{count} đơn` (`customers.web.orderCount`, en with a plural).

Not changed: the currency switch on opening Cài đặt (old behaviour, question in #537).
