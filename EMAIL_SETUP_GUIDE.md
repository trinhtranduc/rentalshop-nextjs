# Email Setup Guide

## Hiện tại: Console Mode (Development)

Email đang ở **Console Mode** - chỉ log ra terminal, không gửi thật.

## Cách test nhanh (Console Mode)

1. **Check API server console logs** khi đăng ký
2. Tìm section `📧 EMAIL (Console Mode)`
3. Copy **verification URL** từ HTML content
4. Paste vào browser để verify email

## Setup AWS SES để gửi email thật

### 1. Cấu hình `.env`

```bash
# Email Provider
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@yourdomain.com

# AWS SES Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_SES_REGION=ap-southeast-1  # hoặc region của bạn
```

### 2. Verify Email/Domain trong AWS SES

- Vào AWS Console → SES
- Verify email address hoặc domain
- Nếu dùng domain, cần add DNS records

### 3. Test

Sau khi setup, registration sẽ gửi email thật!

## Alternative: Dùng Email Testing Service

Có thể dùng services như:
- **Mailtrap** (development)
- **SendGrid** (production)
- **Mailgun** (production)

Cần implement provider mới trong `packages/utils/src/services/email.ts`

