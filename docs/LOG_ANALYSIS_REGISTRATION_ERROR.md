# Phân Tích Lỗi Đăng Ký Từ Log

## 📋 Tóm Tắt Vấn Đề

Từ log file `logs.1767082510057.log`, phát hiện **2 vấn đề nghiêm trọng**:

### 1. ❌ **Lỗi Unique Constraint trên Field `id`**

**Lỗi:**
```
Unique constraint failed on the fields: (`id`)
code: 'P2002'
meta: { modelName: 'User', target: [ 'id' ] }
```

**Xảy ra tại:**
- Line 294: Category creation
- Line 306, 434, 439: User creation

**Nguyên nhân có thể:**
1. **Race Condition**: Nhiều request đồng thời tạo user/category cùng lúc
2. **Database Sequence Out of Sync**: Sequence counter không đồng bộ với dữ liệu thực tế
3. **Manual ID Assignment**: Code nào đó đang set ID manually thay vì để database auto-increment

### 2. ❌ **Lỗi Validation (Zod)**

**Các lỗi validation:**
- `Invalid email address` - Email không hợp lệ
- `Password must be at least 6 characters` - Mật khẩu quá ngắn
- `Name is required` / `First name is required` - Thiếu tên
- `Either 'name' or 'firstName' must be provided` - Thiếu name hoặc firstName

**Xảy ra tại:** Line 705-1001

---

## 🔍 Phân Tích Chi Tiết

### Vấn Đề 1: Unique Constraint trên `id`

**Code hiện tại trong `apps/api/app/api/auth/register/route.ts`:**

```typescript
// Line 257: Tạo user không set ID (để database auto-increment)
const user = await tx.user.create({
  data: {
    email: validatedData.email,
    password: hashedPassword,
    firstName: firstName,
    lastName: lastName,
    phone: validatedData.phone,
    role: USER_ROLE.MERCHANT,
    merchantId: merchant.id,
    outletId: outlet.id,
    emailVerified: false,
    emailVerifiedAt: null
  }
});
```

**Vấn đề:** Code không set `id`, nhưng vẫn bị lỗi unique constraint. Điều này cho thấy:

1. **Có thể có code khác đang set ID manually** (trong `db.users.create()`)
2. **Database sequence bị lỗi** - sequence counter không đồng bộ
3. **Race condition trong transaction** - nhiều transaction cùng lúc

**Kiểm tra `packages/database/src/user.ts`:**

```typescript
// Line 583-589: Code tự động generate ID
const lastUser = await prisma.user.findFirst({
  orderBy: { id: 'desc' },
  select: { id: true }
});
const nextPublicId = (lastUser?.id || 0) + 1;
userData.id = nextPublicId; // ⚠️ ĐÂY LÀ VẤN ĐỀ!
```

**⚠️ VẤN ĐỀ PHÁT HIỆN:**
- Function `db.users.create()` đang **manually set ID** thay vì để database auto-increment
- Điều này gây **race condition** khi có nhiều request đồng thời
- Cả hai request có thể đọc cùng `lastUser.id` và tạo ra cùng `nextPublicId`

---

## ✅ Giải Pháp

### Giải Pháp 1: Loại Bỏ Manual ID Generation (KHUYẾN NGHỊ)

**Vấn đề:** Code đang manually generate ID trong `createUser()` function

**Giải pháp:** Để database tự động tạo ID với `@default(autoincrement())`

**File cần sửa:** `packages/database/src/user.ts`

```typescript
// ❌ BAD: Manual ID generation (gây race condition)
const lastUser = await prisma.user.findFirst({
  orderBy: { id: 'desc' },
  select: { id: true }
});
const nextPublicId = (lastUser?.id || 0) + 1;
userData.id = nextPublicId;

// ✅ GOOD: Để database auto-increment
// Không set id, để Prisma tự động tạo
const user = await prisma.user.create({
  data: {
    // KHÔNG set id ở đây
    email: userData.email,
    // ... other fields
  }
});
```

**Lý do:**
- Database sequence là **atomic** và **thread-safe**
- Tránh race condition hoàn toàn
- Đơn giản hơn và hiệu quả hơn

### Giải Pháp 2: Sửa Database Sequence (Nếu cần)

Nếu sequence bị out of sync, cần reset:

```sql
-- Kiểm tra sequence hiện tại
SELECT last_value FROM users_id_seq;

-- Reset sequence về giá trị cao nhất hiện có
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
```

### Giải Pháp 3: Cải Thiện Error Handling

**File:** `packages/utils/src/core/errors.ts`

```typescript
// Thêm xử lý đặc biệt cho unique constraint trên ID
case 'P2002': {
  const target = error.meta?.target;
  const field = Array.isArray(target) ? target[0] : target;
  
  // ⚠️ Nếu là lỗi trên field 'id', đây là lỗi nghiêm trọng
  if (field === 'id') {
    console.error('🚨 CRITICAL: Unique constraint on ID field - Possible race condition or sequence issue');
    return new ApiError(
      ErrorCode.DATABASE_ERROR,
      'Database ID generation error. Please try again.',
      'Lỗi tạo ID. Vui lòng thử lại.'
    );
  }
  
  // ... existing code for other fields
}
```

---

## 🔧 Các File Cần Sửa

### 1. `packages/database/src/user.ts`

**Sửa function `createUser()` và `simplifiedUsers.create()`:**

```typescript
// ❌ XÓA code này:
const lastUser = await prisma.user.findFirst({
  orderBy: { id: 'desc' },
  select: { id: true }
});
const nextPublicId = (lastUser?.id || 0) + 1;
userData.id = nextPublicId;

// ✅ ĐỂ database tự động tạo ID
// Không set id trong data object
```

### 2. `packages/database/src/product.ts`

**Tương tự, xóa manual ID generation cho Product và Category**

### 3. `packages/database/src/customer.ts`

**Tương tự, xóa manual ID generation cho Customer**

### 4. `packages/utils/src/core/errors.ts`

**Thêm xử lý đặc biệt cho lỗi ID constraint**

---

## 📝 Validation Errors

### Vấn Đề: Validation Schema không đầy đủ

**Giải pháp:** Cải thiện validation schema trong `registerSchema`

**File:** `packages/validation/src/register.ts` (hoặc tương tự)

```typescript
export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  // Hỗ trợ cả name và firstName/lastName
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  // ...
}).refine((data) => {
  // Phải có name HOẶC firstName
  return !!(data.name || data.firstName);
}, {
  message: "Vui lòng cung cấp tên (name hoặc firstName)",
  path: ['name']
});
```

---

## 🧪 Testing

### Test Race Condition

```typescript
// Test script để kiểm tra race condition
const promises = Array(10).fill(null).map(() => 
  fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `test${Math.random()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      businessName: 'Test Business'
    })
  })
);

const results = await Promise.allSettled(promises);
// Kiểm tra không có lỗi unique constraint
```

---

## 📊 Monitoring

### Thêm Logging

```typescript
// Log khi tạo user để debug
console.log('🔍 Creating user:', {
  email: userData.email,
  hasManualId: 'id' in userData,
  manualId: userData.id
});
```

---

## ✅ Checklist

- [ ] Xóa manual ID generation trong `packages/database/src/user.ts`
- [ ] Xóa manual ID generation trong `packages/database/src/product.ts`
- [ ] Xóa manual ID generation trong `packages/database/src/customer.ts`
- [ ] Cải thiện error handling cho ID constraint errors
- [ ] Cải thiện validation schema
- [ ] Test race condition
- [ ] Kiểm tra database sequence sync
- [ ] Thêm monitoring/logging

---

## 🎯 Kết Luận

**Vấn đề chính:** Manual ID generation gây race condition

**Giải pháp:** Để database tự động tạo ID với `@default(autoincrement())`

**Ưu tiên:** **CAO** - Cần sửa ngay vì ảnh hưởng đến tính ổn định của hệ thống

