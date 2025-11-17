# 📧 Setup noreply@anyrent.shop với AWS SES

## 🎯 Mục tiêu

Gửi email verification từ `noreply@anyrent.shop` khi user đăng ký tài khoản.

## ✅ Tin tốt: Không cần verify email address riêng!

Khi bạn **verify domain** `anyrent.shop` trong AWS SES, bạn có thể gửi email từ **BẤT KỲ email nào** trong domain đó:
- ✅ `noreply@anyrent.shop`
- ✅ `support@anyrent.shop`
- ✅ `admin@anyrent.shop`
- ✅ `info@anyrent.shop`
- ✅ Bất kỳ email nào với domain `anyrent.shop`

**Không cần verify từng email address!**

---

## 📋 Setup Steps

### **Bước 1: Verify Domain trong AWS SES** (Quan trọng!)

Nếu bạn chưa verify domain `anyrent.shop`:

1. Vào **AWS SES Console**: https://console.aws.amazon.com/ses/home
2. Chọn region: `ap-southeast-1` (Singapore) hoặc `us-east-1`
3. Click **"Verified identities"** (menu bên trái)
4. Click **"Create identity"**
5. Chọn **"Domain"**
6. Nhập: `anyrent.shop`
7. Click **"Create identity"**
8. **Thêm DNS records** vào domain provider (DKIM + SPF)
9. Đợi domain được verify (5-30 phút)

**Xem chi tiết:** `AWS_SES_SETUP.md`

---

### **Bước 2: Cấu hình Environment Variables**

Thêm vào Railway hoặc `.env`:

```env
# Email Provider
EMAIL_PROVIDER=ses

# From Email (sẽ dùng khi gửi email)
EMAIL_FROM=noreply@anyrent.shop

# AWS SES Region (phải khớp với region bạn verify domain)
AWS_SES_REGION=ap-southeast-1
# Hoặc: AWS_SES_REGION=us-east-1

# AWS Credentials (dùng chung với S3 - đã có sẵn)
# AWS_ACCESS_KEY_ID=your-existing-key
# AWS_SECRET_ACCESS_KEY=your-existing-secret

# Email Verification Feature
ENABLE_EMAIL_VERIFICATION=true

# Client URL (để tạo verification link)
CLIENT_URL=https://anyrent.shop
```

**Lưu ý:**
- `AWS_SES_REGION` phải **KHỚP** với region bạn verify domain
- Nếu verify ở `ap-southeast-1` → dùng `ap-southeast-1`
- Nếu verify ở `us-east-1` → dùng `us-east-1`

---

### **Bước 3: Verify Domain đã được verify**

1. Vào **Verified identities** trong SES
2. Tìm domain `anyrent.shop`
3. Status phải là **"Verified"** (màu xanh)
4. Nếu vẫn là "Verification pending" → Cần thêm DNS records

---

### **Bước 4: Test Email**

**Option 1: Send test email từ SES Console**
1. Trong SES Dashboard, click **"Send test email"**
2. From: `noreply@anyrent.shop`
3. To: Email của bạn
4. Gửi và kiểm tra inbox

**Option 2: Test qua code**
1. Đăng ký tài khoản mới
2. Check email inbox để nhận verification email
3. Email sẽ từ: `noreply@anyrent.shop`

---

## 🔧 Code Flow (Đã được implement)

Khi user đăng ký:

```typescript
// apps/api/app/api/auth/register/route.ts

// 1. Tạo user
const user = await db.users.create({ ... });

// 2. Tạo verification token
const verification = await createEmailVerification(user.id, user.email);

// 3. Gửi email verification từ noreply@anyrent.shop
const emailResult = await sendVerificationEmail(
  user.email,           // To: user@example.com
  userName,             // Name: John Doe
  verification.token    // Token: abc123...
);

// Email sẽ được gửi từ: noreply@anyrent.shop (từ EMAIL_FROM env)
```

**Email service sẽ tự động:**
- Đọc `EMAIL_FROM=noreply@anyrent.shop` từ env
- Sử dụng `EMAIL_PROVIDER=ses`
- Gửi qua AWS SES API
- From: `AnyRent <noreply@anyrent.shop>`

---

## 📝 Environment Variables Checklist

Đảm bảo bạn có **TẤT CẢ** các variables sau trong Railway:

```env
# ========================================
# EMAIL CONFIGURATION
# ========================================
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@anyrent.shop
AWS_SES_REGION=ap-southeast-1
ENABLE_EMAIL_VERIFICATION=true
CLIENT_URL=https://anyrent.shop

# AWS Credentials (đã có từ S3)
AWS_ACCESS_KEY_ID=your-existing-key
AWS_SECRET_ACCESS_KEY=your-existing-secret
```

---

## ⚠️ Common Issues

### **Issue 1: "Email address not verified" error**

**Nguyên nhân:**
- Domain `anyrent.shop` chưa được verify trong SES
- Hoặc đang ở Sandbox mode và gửi đến email chưa verify

**Giải pháp:**
1. Verify domain trong SES (thêm DNS records)
2. Request production access để gửi đến bất kỳ email nào

### **Issue 2: "Invalid region" error**

**Nguyên nhân:**
- `AWS_SES_REGION` không khớp với region bạn verify domain

**Giải pháp:**
1. Check region bạn verify domain trong SES
2. Update `AWS_SES_REGION` cho đúng

### **Issue 3: "Access Denied" error**

**Nguyên nhân:**
- IAM user không có quyền SES
- Hoặc AWS credentials sai

**Giải pháp:**
1. Check IAM user có policy `AmazonSESFullAccess`
2. Verify AWS credentials đúng

---

## ✅ Verification Checklist

Trước khi deploy, đảm bảo:

- [ ] Domain `anyrent.shop` đã được verify trong SES (status = "Verified")
- [ ] DNS records (DKIM + SPF) đã được thêm vào domain provider
- [ ] `EMAIL_PROVIDER=ses` trong Railway env
- [ ] `EMAIL_FROM=noreply@anyrent.shop` trong Railway env
- [ ] `AWS_SES_REGION` khớp với region verify domain
- [ ] AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) đúng
- [ ] `ENABLE_EMAIL_VERIFICATION=true`
- [ ] `CLIENT_URL` đúng (https://anyrent.shop)
- [ ] Đã request production access (nếu muốn gửi >200 emails/day)

---

## 🚀 Quick Start

**Nếu đã verify domain:**

1. Thêm env variables vào Railway:
```env
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@anyrent.shop
AWS_SES_REGION=ap-southeast-1
ENABLE_EMAIL_VERIFICATION=true
```

2. Deploy và test đăng ký tài khoản mới

3. Check email inbox - Email sẽ từ `noreply@anyrent.shop` ✅

---

## 📚 Related Files

- `AWS_SES_SETUP.md` - Hướng dẫn verify domain chi tiết
- `EMAIL_VERIFICATION_SETUP.md` - Tổng quan email verification system
- `packages/utils/src/services/email.ts` - Email service implementation

---

## 💡 Tips

1. **Tên sender**: Hiện tại là "AnyRent", có thể đổi trong code:
   ```typescript
   const fromName = options.fromName || 'AnyRent';
   ```

2. **Reply-to address**: Có thể thêm reply-to address nếu muốn:
   ```typescript
   // Trong sendVerificationEmail, thêm:
   replyTo: 'support@anyrent.shop'
   ```

3. **Multiple domains**: Nếu có nhiều domains, verify từng domain trong SES và switch qua env variable.

