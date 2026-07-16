# Project Conventions & Important Context

## Mobile App (iOS - App Store)

- Mobile app là native iOS (Swift, Alamofire, SwiftyJSON)
- Đã publish trên App Store → **KHÔNG THỂ update code mobile ngay**
- Mọi fix cho mobile phải thực hiện **server-side** cho đến khi release app mới
- Mobile gửi header `X-Client-Platform: mobile` và `X-Device-Type: ios` trong mọi request
- Mobile gửi `User-Agent: AnyRent-iOS/1.0.0`

### Mobile Workarounds (server-side)

- **Product sort**: Mobile hardcode `sortBy=createdAt&sortOrder=desc` → Server override sort thành `name/asc` khi detect mobile platform (`apps/api/app/api/products/route.ts`)
- **Token expiry**: Mobile không có refresh token logic → Server issue 30-day token cho mobile (thay vì 7d cho web). Grace period 24h cho expired tokens (`apps/api/lib/jwt-edge.ts`)
- **Session expiry**: Mobile session 30 ngày (web = 7 ngày)

### Khi release mobile app mới, cần sửa:

1. `apps/mobile/POS ADBD/ViewModels/MainViewModel.swift` — đổi `sortBy: "createdAt"` → `sortBy: "name"`, `sortOrder: "desc"` → `sortOrder: "asc"`
2. Integrate refresh token flow: lưu `refreshToken` từ login, gọi `POST /api/mobile/auth/refresh` khi token expired
3. Bỏ server-side sort override sau khi mobile app mới đã phổ biến

## Authentication & Tokens

- Web: access token 7 ngày + proactive refresh (client-side `tryProactiveRefresh` trong `packages/utils/src/core/common.ts`)
- Mobile: access token 30 ngày + 24h grace period (no client-side refresh)
- Refresh token system: `POST /api/mobile/auth/refresh` (token rotation, 30-day refresh tokens)
- Token generation: `packages/auth/src/jwt.ts` — `generateToken()` (7d) vs `generateMobileToken()` (30d)
- Platform detection: `apps/api/lib/platform-detector.ts`

## Product Availability

- API chính: `GET /api/products/{id}/availability` (dùng bởi client `useAvailabilityCheck` hook)
- Logic overlap: `orderPickup < periodEnd AND orderReturn > periodStart`
- **QUAN TRỌNG**: `effectivelyAvailable = totalStock - conflictingQuantity` (KHÔNG dùng `totalAvailableStock` để tránh double-count với `outletStock.renting`)
- Chỉ count orders RESERVED + PICKUPED (RETURNED/CANCELLED không count)
- SALE RESERVED count, SALE COMPLETED không count

## Default Sort

- Products: **name ASC** (mặc định cho cả API, client page, và Zod schema)
- Định nghĩa tại:
  - `packages/database/src/product.ts` — `buildProductOrderByClause()`
  - `packages/utils/src/core/validation-schemas.ts` — `productsQuerySchema`
  - `apps/client/app/products/page.tsx` — client-side default

## Database

- ORM: Prisma + PostgreSQL
- Schema: `prisma/schema.prisma`
- DB operations: `packages/database/src/` → exported qua `db` object
- Refresh tokens: `packages/database/src/refresh-tokens.ts` (SHA-256 hashed, rotation pattern)

## API Architecture

- Next.js App Router API routes: `apps/api/app/api/`
- Edge middleware: `apps/api/middleware.ts` (JWT validation, CORS, platform detection)
- Auth: `packages/auth/src/` (server exports via `@rentalshop/auth/server`)
- Shared utils: `packages/utils/src/`
