---
name: api-route-standard
description: Use when creating or modifying any Next.js route handler under apps/api/app/api/**/route.ts. Enforces the AnyRent API standard (auth wrapper, zod validation, ResponseBuilder, handleApiError, dual-ID translation, merchant/outlet scoping, i18n error codes).
---

# AnyRent API route standard

Every handler in `apps/api/app/api/**/route.ts` follows the same shape. Deviation is a review blocker.

1. **Auth wrapper.** Export `GET`/`POST`/… as `with<Permission>Auth(async (request, { user, userScope }) => …)`
   from `@rentalshop/auth/server`. Pick the narrowest wrapper (`withReadOnlyAuth`, `withOrderCreateAuth`,
   `withProductManagementAuth`, `withAdminAuth`, …). Never export a bare handler.
2. **Validate input with zod** (`z.object` for query via `Object.fromEntries(searchParams)`, body via
   `request.json()`; use `z.coerce.number()` for query numbers). On failure return
   `NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 })`.
3. **Scope the query.** Apply `userScope` (merchantId / outletId) to every read and write. `ADMIN`/`OPS`
   may pass explicit `merchantId`; everyone else is forced to their own scope.
4. **Data access** through `db` from `@rentalshop/database` and the per-model helpers in
   `packages/database/src/<model>.ts`. Never instantiate `PrismaClient` in a route.
5. **Dual IDs.** Accept and return numeric `publicId`/`id`. Resolve to CUIDs only for Prisma calls.
6. **Respond** with `ResponseBuilder.success('<CODE>', data)` / `ResponseBuilder.error('<CODE>')` from
   `@rentalshop/utils`. Codes are SCREAMING_SNAKE and must exist in `locales/*/errors*.json`
   (run `yarn audit:error-translations`).
7. **Errors.** Wrap the body in `try/catch`; in `catch` do
   `const { response, statusCode } = handleApiError(error); return NextResponse.json(response, { status: statusCode });`
8. **Dates.** Query params are `YYYY-MM-DD` Vietnam civil days; convert with `getUtcRangeForDateKeys`
   and filter in SQL. Pagination: `page` (1-based) and `limit` (max 500 for mobile).
9. **Docs + tests.** Add a JSDoc block stating role access and indexed fields. Add or extend a jest test in
   `tests/` when the route carries business rules (availability, revenue, subscription, permissions).
10. **Mobile parity.** If the response shape changes, update the iOS (`apps/mobile`) and Android
    (`apps/mobile-android`) decoders in the same PR or open an `intent/` note.

Reference implementation: `apps/api/app/api/calendar/orders/by-date/route.ts`.
