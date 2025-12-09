# 🚀 AWS SES Complete Setup Guide

Hướng dẫn đầy đủ về setup AWS SES cho email service, bao gồm domain verification, IAM configuration, và troubleshooting.

---

## 📋 Table of Contents

1. [Tại sao chọn AWS SES?](#-tại-sao-chọn-aws-ses)
2. [Setup Domain Verification](#-setup-domain-verification)
3. [IAM Configuration](#-iam-configuration)
4. [Environment Variables](#-environment-variables)
5. [Production Access Request](#-production-access-request)
6. [Troubleshooting](#-troubleshooting)

---

## 💡 Tại sao chọn AWS SES?

✅ **Đã có AWS Account** - Đang dùng S3 rồi  
✅ **Rẻ nhất khi scale** - $0.10 cho 1,000 emails  
✅ **Unified AWS Ecosystem** - Tất cả trong 1 account  
✅ **No vendor lock-in** - Standard AWS service  

### 💰 So sánh Cost

| Provider | Free Tier | Cost sau free (1,000 emails) |
|----------|-----------|------------------------------|
| **AWS SES** | 1,000/tháng* | **$0.10** ⭐ Rẻ nhất |
| Brevo | 9,000/tháng | $1.25 |
| Resend | 3,000/tháng | $0.67 |

*Với Railway deployment (không phải EC2)

---

## 📋 Setup Domain Verification

### Bước 1: Navigate to Amazon SES

**Cách 1: Direct Link (Nhanh nhất)**
- Vào trực tiếp: https://console.aws.amazon.com/ses/home

**Cách 2: Từ AWS Console**
1. Đăng nhập [AWS Console](https://console.aws.amazon.com)
2. Ở search bar trên cùng, gõ: **"SES"** hoặc **"Simple Email Service"**
3. Click vào **Amazon SES** service
4. **Quan trọng**: Phải chọn **region** trước (ví dụ: `us-east-1` hoặc `ap-southeast-1`)

### Bước 2: Verify Domain

**Cách 1: Dùng Setup Wizard (Dễ nhất)** ⭐

1. **Add your email address** (email của bạn để verify identity)
2. **Add your sending domain** → Nhập: `anyrent.shop`
3. **Deliverability enhancements** → Giữ bật (recommended)
4. **Review and get started**

**Cách 2: Vào Verified identities trực tiếp**

1. Click **"Verified identities"** trong menu bên trái
2. Click button **"Create identity"**
3. Chọn **"Domain"** → Nhập: `anyrent.shop`
4. Click **"Create identity"**

### Bước 3: Thêm DNS Records (QUAN TRỌNG!)

Sau khi tạo domain identity, AWS sẽ hiển thị DNS records cần thêm:

**DKIM Records** (3 CNAME records):
```
Type: CNAME
Name: [selector]._domainkey.anyrent.shop
Value: [value].dkim.amazonses.com
```

**SPF Record**:
```
Type: TXT
Name: anyrent.shop
Value: v=spf1 include:amazonses.com ~all
```

**DMARC Record** (Optional nhưng recommended):
```
Type: TXT
Name: _dmarc.anyrent.shop
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@anyrent.shop
```

**Thực hiện:**
1. Copy các DNS records từ AWS SES console
2. Thêm vào DNS provider (Namecheap, GoDaddy, etc.)
3. Đợi 5-30 phút để DNS propagate
4. Check lại AWS SES → Domain status = **"Verified"**

---

## 🔑 IAM Configuration

### Có thể dùng chung AWS credentials với S3

**KHÔNG CẦN** tạo IAM user riêng cho SES. **CÓ THỂ** dùng chung credentials với S3, **NHƯNG** IAM user phải có cả S3 và SES permissions.

### Kiểm tra IAM User có quyền SES

1. Vào **IAM** → **Users**
2. Tìm IAM user đang dùng cho S3
3. Click vào user đó → Tab **Permissions**
4. Kiểm tra policies:

**✅ Phải có một trong các policies:**
- `AmazonSESFullAccess` (full quyền)
- Custom policy với SES permissions

**❌ Nếu chỉ có:**
- `AmazonS3FullAccess` → **Thiếu SES permissions!**

### Thêm SES Permissions

**Option 1: Attach thêm AmazonSESFullAccess** (Đơn giản nhất)
1. Click **Add permissions** → **Attach policies directly**
2. Search: `AmazonSESFullAccess`
3. Check vào policy
4. Click **Add permissions**

**Option 2: Tạo custom policy** (Restricted permissions)
1. IAM → **Policies** → **Create policy**
2. Click **JSON** tab
3. Paste policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendStatistics",
        "ses:GetSendQuota"
      ],
      "Resource": "*"
    }
  ]
}
```
4. Click **Next** → Name: `RentalShopSESPermissions`
5. Click **Create policy**
6. Attach policy vào IAM user

---

## ⚙️ Environment Variables

Thêm vào Railway environment variables:

```env
# Email Provider
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@anyrent.shop

# AWS SES Configuration
AWS_ACCESS_KEY_ID=your-existing-access-key  # Có thể dùng chung với S3
AWS_SECRET_ACCESS_KEY=your-existing-secret-key  # Có thể dùng chung với S3
AWS_SES_REGION=us-east-1  # hoặc ap-southeast-1
```

**Quan trọng:** 
- Có thể dùng lại credentials từ S3 setup
- `EMAIL_FROM` phải từ domain đã verify (`anyrent.shop`)
- Region phải match với region đã verify domain

---

## 🚀 Production Access Request

### AWS SES bắt đầu ở Sandbox Mode

**Hạn chế:**
- ❌ Daily sending quota: 200 emails/24h
- ❌ Max send rate: 1 email/second
- ❌ Chỉ gửi được đến **verified emails**

### Request Production Access

**Cách 1: Từ Dashboard**
1. Trong dashboard, tìm task **"Request production access"**
2. Click button trong task đó

**Cách 2: Từ Account Dashboard**
1. Click **"Account dashboard"** trong menu bên trái
2. Tìm section **"Sending limits"** hoặc **"Account status"**
3. Click **"Request production access"**

**Điền form:**
- **Mail Type**: Transactional
- **Website URL**: https://anyrent.shop
- **Use case**: Account verification emails cho rental shop management platform
- **Describe your use case**: 
  ```
  We are a rental shop management SaaS platform. We need to send:
  - Email verification emails to new users
  - Password reset emails
  - Order confirmation emails
  - Notification emails to customers and merchants
  ```
- **Expected volume**: 10,000/month
- **Bounce and complaint rates**: 0% (target)

**Submit và đợi approval:**
- ⏱️ Thường mất **24-48 giờ**
- AWS sẽ review request
- Bạn sẽ nhận email khi được approve

**Sau khi được approve:**
- ✅ Tăng daily quota (có thể lên đến 50,000/day)
- ✅ Tăng send rate (có thể lên đến 14 emails/second)
- ✅ Có thể gửi đến bất kỳ email nào (không cần verify)

---

## 🔧 Troubleshooting

### Lỗi: "InvalidClientTokenId"

**Nguyên nhân:** AWS credentials không hợp lệ hoặc thiếu quyền SES

**Giải pháp:**
1. Kiểm tra IAM user có `AmazonSESFullAccess` policy
2. Verify `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY` đúng
3. Check region match với region đã verify domain

### Lỗi: "Email address not verified"

**Nguyên nhân:** 
- Domain chưa được verify
- Hoặc đang ở sandbox mode và gửi đến email chưa verify

**Giải pháp:**
1. Check domain status trong AWS SES → Phải là **"Verified"**
2. Nếu ở sandbox mode, verify email address hoặc request production access

### Domain không verify được

**Nguyên nhân:** DNS records chưa được thêm đúng

**Giải pháp:**
1. Verify DNS records đã được thêm vào DNS provider
2. Đợi 5-30 phút để DNS propagate
3. Check lại trong AWS SES console
4. Nếu vẫn không work, verify từng record bằng `dig` hoặc `nslookup`

---

## 📝 Checklist

### Setup hoàn tất khi:

- [ ] Domain `anyrent.shop` đã được verify trong AWS SES
- [ ] DNS records (DKIM, SPF) đã được thêm vào DNS provider
- [ ] IAM user có `AmazonSESFullAccess` policy
- [ ] Environment variables đã được set trong Railway
- [ ] Production access đã được request (nếu cần)
- [ ] Test email đã được gửi thành công

---

## 📚 Related Docs

- `AWS_S3_SETUP_GUIDE.md` - AWS S3 setup (có thể dùng chung credentials)
- `EMAIL_VERIFICATION_SETUP.md` - Email verification flow
- `EMAIL_CONFIGURATION_CHECKLIST.md` - Detailed checklist

