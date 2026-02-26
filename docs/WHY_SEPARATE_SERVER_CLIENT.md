# Tại sao phải tách Server vs Client?

## 🤔 Câu hỏi của bạn

> "Tôi confuse tại sao phải tách ra server vs client? Tôi thấy admin và client đều giống nhau - gọi API và UI"

## ✅ Câu trả lời ngắn gọn

**Bạn đúng!** Admin và Client app đều giống nhau:
- ✅ Cả 2 đều là Next.js apps
- ✅ Cả 2 đều có React UI (client components)
- ✅ Cả 2 đều gọi API từ Railway

**NHƯNG** vấn đề không phải ở Admin/Client app, mà ở **package `@rentalshop/utils`**:

## 🔍 Vấn đề thực sự

### 1. Package `@rentalshop/utils` được dùng ở 2 nơi:

```
┌─────────────────────────────────────────────────────────┐
│  Package @rentalshop/utils                               │
│                                                           │
│  ├─ Client Components (Browser)                          │
│  │   └─ apps/client/app/customers/page.tsx              │
│  │   └─ apps/admin/app/products/page.tsx                │
│  │   └─ ❌ KHÔNG có next/server, prisma, fs              │
│  │                                                       │
│  └─ API Routes (Server)                                  │
│      └─ apps/api/app/api/products/route.ts              │
│      └─ ✅ CÓ next/server, prisma, fs                   │
└─────────────────────────────────────────────────────────┘
```

### 2. Khi build package `@rentalshop/utils`:

**Vấn đề:**
- Nếu `validation.ts` import `NextResponse` từ `next/server`
- Khi Next.js build **client-side code** (React components)
- Next.js cố gắng bundle `@rentalshop/utils` vào browser
- ❌ **FAIL** vì `next/server` không tồn tại trong browser!

**Lỗi bạn thấy:**
```
Error: Cannot find module 'next/server' imported from 
@rentalshop/utils/dist/index.mjs
```

## 💡 Giải pháp đơn giản hơn

Thay vì tách ra `server.ts`, chúng ta có thể:

### Option 1: Dynamic Import (Đơn giản nhất) ✅

```typescript
// packages/utils/src/core/validation.ts

// ❌ KHÔNG import ở top-level
// import { NextResponse } from 'next/server';

// ✅ Import động khi cần (chỉ chạy trên server)
export async function checkPlanLimitIfNeeded(...) {
  // ...
  const { NextResponse } = await import('next/server');
  return NextResponse.json(errorResponse, { status: statusCode });
}
```

**Lợi ích:**
- ✅ Không cần tách file
- ✅ Code vẫn ở một chỗ
- ✅ Next.js không bundle `next/server` vào client code

### Option 2: Type-only Import (Cho types)

```typescript
// packages/utils/src/cors.ts

// ✅ Chỉ import type, không import runtime code
import type { NextRequest } from 'next/server';

export function buildCorsHeaders(request: NextRequest) {
  // request.headers.get() vẫn hoạt động vì NextRequest là object
  // Chỉ type definition được import, không phải runtime code
}
```

## 🎯 Kết luận

**Bạn không cần tách ra `server.ts` nếu:**
- ✅ Sử dụng dynamic import cho `next/server`
- ✅ Sử dụng type-only import cho types
- ✅ Đảm bảo Next.js không bundle server code vào client

**Chỉ cần tách khi:**
- ❌ Code quá phức tạp
- ❌ Cần rõ ràng hơn về server-only vs client-safe

## 📝 Recommendation

**Giữ nguyên structure hiện tại**, chỉ cần:
1. ✅ Dynamic import cho `NextResponse` trong `checkPlanLimitIfNeeded`
2. ✅ Type-only import cho `NextRequest` trong `cors.ts`
3. ✅ Không cần tách `server.ts` nếu không muốn

**Code sẽ đơn giản hơn và vẫn hoạt động!**
