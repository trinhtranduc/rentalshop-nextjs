# Tại sao cần `export const dynamic = 'force-dynamic'`?

## ❓ **Câu hỏi: Tại sao trước đây code work mà giờ không work?**

## 📊 **So sánh Trước và Sau**

### ✅ **TRƯỚC ĐÂY (Single Database)**

```typescript
// apps/api/app/api/customers/route.ts
import { db } from '@rentalshop/database';

export async function GET(request: NextRequest) {
  // Code đơn giản, chỉ dùng Prisma client có sẵn
  const customers = await db.customers.search({});
  return NextResponse.json(customers);
}
```

**Tại sao work:**
- ✅ Chỉ có 1 database connection (DATABASE_URL)
- ✅ Prisma client được generate đơn giản
- ✅ Next.js có thể analyze code mà không cần execute
- ✅ Không có server-only packages được import trực tiếp

### ❌ **SAU KHI THÊM MULTI-TENANT**

```typescript
// apps/api/app/api/auth/login/route.ts
import { getMainDb, getTenantDb } from '@rentalshop/database';

export async function POST(request: NextRequest) {
  // Code phức tạp hơn:
  // 1. Cần detect subdomain
  // 2. Connect đến Main DB hoặc Tenant DB động
  // 3. Import server-only packages (pg) để tạo database
  const mainDb = getMainDb();
  const tenantDb = await getTenantDb(subdomain);
  // ...
}
```

**Tại sao không work:**
- ❌ **Multi-tenant architecture** import `tenant-db-manager.ts`
- ❌ `tenant-db-manager.ts` import `pg` package (server-only)
- ❌ Next.js build process cố **analyze và execute** code trong build time
- ❌ Khi build, không có database connection hoặc Prisma Query Engine
- ❌ Build fails với error: `Prisma Client could not locate the Query Engine`

## 🔍 **Root Cause: Next.js 14 Build Optimization**

### **Next.js 14 đã thay đổi behavior:**

1. **Static Optimization** (Mới):
   - Next.js tự động analyze API routes
   - Nếu có thể, nó sẽ **pre-render** trong build time
   - Điều này giúp optimize performance

2. **Build-time Execution** (Vấn đề):
   - Next.js cố execute code để analyze dependencies
   - Import statements được resolve trong build time
   - Server-only packages (`pg`) không available trong build context

3. **Prisma Query Engine** (Vấn đề):
   - Prisma cần native binaries (`.node` files)
   - Build process không có access đến Prisma engines
   - Code fails khi cố connect database trong build time

## ✅ **Giải pháp: `export const dynamic = 'force-dynamic'` (OFFICIAL WAY)**

### **Đây là Official Way theo Next.js Documentation:**

```typescript
// Disable static generation - API routes should only run at runtime
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

**Ý nghĩa:**
- `dynamic = 'force-dynamic'`: **Force** API route chạy ở runtime only (không analyze trong build time)
- `runtime = 'nodejs'`: Đảm bảo sử dụng Node.js runtime (không Edge runtime)

### **Tại sao đây là Official Way:**

1. ✅ **Theo Next.js 14 Documentation**: 
   - [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)
   - Chính thức recommended cho API routes có database operations

2. ✅ **Không phải workaround**:
   - Đây là feature chính thức của Next.js
   - Được design để handle dynamic content
   - Recommended cho server-side operations

3. ✅ **Best Practice**:
   - Tất cả API routes với database nên có `dynamic = 'force-dynamic'`
   - Prevents build-time execution issues
   - Ensures proper runtime behavior

## 📝 **Khi nào cần dùng?**

### ✅ **CẦN DÙNG khi:**
- API routes có database operations (Prisma, SQL, etc.)
- API routes có server-only imports (`pg`, `fs`, `child_process`)
- API routes cần dynamic data (không thể pre-render)
- Multi-tenant architecture với dynamic database connections

### ❌ **KHÔNG CẦN khi:**
- Static API routes (return static data)
- Simple routes không có side effects
- Routes chỉ return constants

## 🎯 **Kết luận**

**Trước đây work vì:**
- Code đơn giản hơn, không có server-only imports trực tiếp
- Next.js không cần execute code trong build time
- Single database, Prisma client đơn giản

**Giờ không work vì:**
- Multi-tenant architecture phức tạp hơn
- Import server-only packages (`pg`)
- Next.js 14 cố optimize và execute trong build time
- Prisma Query Engine không available trong build context

**Giải pháp:**
- ✅ `export const dynamic = 'force-dynamic'` - **OFFICIAL WAY**
- ✅ Đây không phải workaround, mà là feature chính thức
- ✅ Recommended cho tất cả API routes với database

## 📚 **References**

- [Next.js Route Segment Config - dynamic](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)
- [Next.js API Routes - Runtime](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime)
- [Prisma with Next.js - Standalone Output](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

