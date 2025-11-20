# Hướng dẫn thiết lập Email Verification

## Tổng quan

Hệ thống đã được tích hợp tính năng xác thực email khi đăng ký tài khoản. Người dùng cần xác thực email trước khi có thể đăng nhập.

## Các tính năng đã triển khai

### 1. Database Schema
- ✅ Thêm field `emailVerified` và `emailVerifiedAt` vào User model
- ✅ Tạo model `EmailVerification` để lưu trữ token xác thực
- ✅ Token có thời hạn 24 giờ

### 2. Email Service
- ✅ Tích hợp Resend API để gửi email
- ✅ Hỗ trợ console mode cho development
- ✅ Email template tiếng Việt với design đẹp

### 3. API Endpoints
- ✅ `POST /api/auth/register` - Tự động gửi email verification khi đăng ký
- ✅ `POST /api/auth/verify-email` - Xác thực email qua token
- ✅ `GET /api/auth/verify-email?token=xxx` - Xác thực qua link email (redirect)
- ✅ `POST /api/auth/resend-verification` - Gửi lại email xác thực

### 4. Security
- ✅ Login yêu cầu email đã verify
- ✅ Token chỉ sử dụng được 1 lần
- ✅ Token tự động hết hạn sau 24 giờ

## Cấu hình Email Provider

### Option 1: Resend (Khuyến nghị cho production)

1. Đăng ký tài khoản tại [Resend.com](https://resend.com)
2. Tạo API Key từ dashboard
3. Thêm vào `.env`:

```env
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@anyrent.shop
RESEND_API_KEY=re_xxxxxxxxxxxxx
CLIENT_URL=https://anyrent.shop
```

**Quan trọng**: Bạn cần verify domain `anyrent.shop` trong Resend dashboard để có thể gửi email từ domain này.

### Option 2: Console Mode (Development)

Chỉ dùng cho development, email sẽ được log ra console:

```env
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@localhost
CLIENT_URL=http://localhost:3000
```

### Option 3: SendGrid (Tùy chọn)

```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@anyrent.shop
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
CLIENT_URL=https://anyrent.shop
```

**Lưu ý**: SendGrid integration chưa được triển khai, hiện tại sẽ fallback về console mode.

## Cấu hình Domain trong Resend

### Bước 1: Verify Domain

1. Đăng nhập Resend dashboard
2. Vào **Domains** section
3. Click **Add Domain**
4. Nhập `anyrent.shop`
5. Thêm các DNS records theo hướng dẫn:
   - **SPF Record**: `v=spf1 include:_spf.resend.com ~all`
   - **DKIM Records**: (Resend sẽ cung cấp)
   - **DMARC Record**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@anyrent.shop`

### Bước 2: Wait for Verification

Sau khi thêm DNS records, đợi Resend verify domain (thường mất vài phút đến vài giờ).

### Bước 3: Test Email

Sau khi domain được verify, bạn có thể gửi email từ `noreply@anyrent.shop` hoặc bất kỳ email nào với domain `anyrent.shop`.

## Workflow đăng ký

### Trước khi verify email:
1. User đăng ký → Tài khoản được tạo
2. Email verification được gửi tự động
3. User **KHÔNG** nhận được JWT token
4. User **KHÔNG THỂ** đăng nhập

### Sau khi verify email:
1. User click link trong email hoặc sử dụng token
2. Email được verify → User nhận JWT token
3. User có thể đăng nhập bình thường

## Flow đăng nhập

```
User Login
  ↓
Check email verified?
  ├─ NO → Error: "Email chưa được xác thực"
  └─ YES → Continue login
```

## API Usage Examples

### 1. Register (Auto send verification email)

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MERCHANT",
  "businessName": "My Business"
}

# Response:
{
  "success": true,
  "code": "MERCHANT_ACCOUNT_CREATED_PENDING_VERIFICATION",
  "message": "Merchant account created successfully. Please check your email...",
  "data": {
    "requiresEmailVerification": true,
    "user": {
      "emailVerified": false,
      ...
    }
  }
}
```

### 2. Verify Email (POST)

```bash
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "abc123..."
}

# Response:
{
  "success": true,
  "code": "EMAIL_VERIFIED_SUCCESS",
  "data": {
    "user": {
      "emailVerified": true,
      ...
    },
    "token": "jwt_token_here"
  }
}
```

### 3. Verify Email (GET - from email link)

```
GET /api/auth/verify-email?token=abc123...

# Redirects to:
https://anyrent.shop/verify-email?success=true&token=jwt_token
```

### 4. Resend Verification Email

```bash
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}

# Response:
{
  "success": true,
  "code": "VERIFICATION_EMAIL_SENT",
  "data": {
    "message": "Email xác thực đã được gửi..."
  }
}
```

## Migration Database

Sau khi cập nhật Prisma schema, chạy migration:

```bash
# Development
npx prisma migrate dev --name add_email_verification

# Production (Railway)
npx prisma migrate deploy
```

## Cài đặt Dependencies

```bash
# Install Resend package
cd packages/utils
yarn add resend

# Rebuild packages
yarn build
```

## Testing

### Test trong Development (Console Mode)

1. Set `EMAIL_PROVIDER=console` trong `.env`
2. Đăng ký tài khoản mới
3. Kiểm tra console logs - email sẽ được hiển thị ở đó

### Test với Resend

1. Set `EMAIL_PROVIDER=resend` và cấu hình `RESEND_API_KEY`
2. Verify domain trong Resend dashboard
3. Đăng ký tài khoản mới
4. Kiểm tra email inbox

## Troubleshooting

### Email không được gửi
- ✅ Kiểm tra `EMAIL_PROVIDER` đã đúng chưa
- ✅ Kiểm tra `RESEND_API_KEY` có hợp lệ không
- ✅ Kiểm tra domain đã được verify trong Resend chưa
- ✅ Kiểm tra console logs để xem error

### Token không hợp lệ
- ✅ Token chỉ dùng được 1 lần
- ✅ Token hết hạn sau 24 giờ
- ✅ Yêu cầu gửi lại email verification

### User không thể đăng nhập
- ✅ Kiểm tra email đã verify chưa
- ✅ Xem response từ login API để biết lỗi cụ thể

## Next Steps

1. ✅ Tạo migration database
2. ✅ Cài đặt Resend package: `yarn add resend` trong `packages/utils`
3. ✅ Cấu hình environment variables
4. ✅ Verify domain trong Resend
5. ✅ Test đăng ký và verify email

## Notes

- Email verification là **bắt buộc** cho tất cả user mới
- Token verification có thể dùng qua POST hoặc GET (email link)
- Có thể gửi lại email verification nếu cần
- Token tự động expire sau 24 giờ

