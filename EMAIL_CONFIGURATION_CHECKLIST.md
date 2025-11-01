# 📋 Email Configuration Checklist

## ✅ Checklist để kiểm tra cấu hình email cho Resend Verification

---

## 🔐 **1. AWS CREDENTIALS (QUAN TRỌNG NHẤT)**

### Trên Railway Dashboard → API Service → Variables

| Variable | Value | Status | Notes |
|----------|-------|--------|-------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` (20 chars) | ⬜ | Cần có AWS IAM user với SES permissions |
| `AWS_SECRET_ACCESS_KEY` | `xxxxx...` (40 chars) | ⬜ | Secret key từ AWS IAM |
| `AWS_SES_REGION` | `ap-southeast-1` | ⬜ | Phải match với region verify domain |

**⚠️ Kiểm tra:**
- [ ] AWS credentials có tồn tại trong Railway?
- [ ] IAM user có permission `ses:SendEmail`?
- [ ] Region đúng với region đã verify domain trong SES?

---

## 📧 **2. EMAIL PROVIDER CONFIGURATION**

### Trên Railway Dashboard → API Service → Variables

| Variable | Value | Status | Notes |
|----------|-------|--------|-------|
| `EMAIL_PROVIDER` | `ses` hoặc `console` | ⬜ | `console` = dev, `ses` = production |
| `EMAIL_FROM` | `noreply@anyrent.shop` | ⬜ | Email từ domain đã verify |
| `ENABLE_EMAIL_VERIFICATION` | `true` | ⬜ | Bật tính năng email verification |

**⚠️ Kiểm tra:**
- [ ] `EMAIL_PROVIDER` được set đúng giá trị?
- [ ] `EMAIL_FROM` từ domain `anyrent.shop`?
- [ ] `EMAIL_FROM` đã được verify trong AWS SES?

---

## 🌍 **3. AWS SES SETUP**

### Bước 1: Verify Domain trong AWS SES
- [ ] Đã vào AWS Console → SES
- [ ] Đã chọn region: `ap-southeast-1` hoặc `us-east-1`
- [ ] Đã tạo identity cho domain `anyrent.shop`
- [ ] Status của domain = **"Verified"** (không phải "Pending")

### Bước 2: DNS Records
- [ ] Đã thêm 3 DKIM records vào DNS
- [ ] Đã thêm SPF record vào DNS
- [ ] DNS records đã propagate (wait 5-10 phút)

### Bước 3: Production Access
- [ ] Domain đã được verified
- [ ] Đã request production access
- [ ] Production access đã được approved
- [ ] Không còn ở Sandbox mode

**Kiểm tra status:**
- Go to AWS SES → Account Dashboard
- Check: **Sending quota** > **200/day** = Production mode ✅
- Check: **Sending quota** = 200/day = Sandbox mode ❌

---

## 🔑 **4. IAM USER PERMISSIONS**

### Tạo IAM User cho SES (nếu chưa có)

**Bước 1: Tạo IAM User**
- [ ] AWS Console → IAM → Users
- [ ] Click "Create user"
- [ ] Username: `rentalshop-ses-user` hoặc tương tự
- [ ] Access type: **Programmatic access**

**Bước 2: Attach Policy**
- [ ] Attach policy: `AmazonSESFullAccess` (hoặc custom policy)
- [ ] Hoặc tạo custom policy với permission:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ],
        "Resource": "*"
      }
    ]
  }
  ```

**Bước 3: Get Credentials**
- [ ] Lưu Access Key ID
- [ ] Lưu Secret Access Key
- [ ] **Update vào Railway** environment variables

---

## 🧪 **5. TEST CONFIGURATION**

### Test với Console Mode (Development)

```bash
# Set on Railway
EMAIL_PROVIDER=console
```

**Kiểm tra:**
- [ ] Request resend verification API
- [ ] Xem logs trên Railway
- [ ] Thấy email content trong logs ✅

### Test với SES Mode (Production)

```bash
# Set on Railway
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=ap-southeast-1
EMAIL_FROM=noreply@anyrent.shop
```

**Kiểm tra:**
- [ ] Request resend verification API
- [ ] Xem logs trên Railway
- [ ] Không thấy error về credentials ✅
- [ ] Email được gửi thành công ✅

---

## 🐛 **6. DEBUGGING STEPS**

### Nếu gặp lỗi `InvalidClientTokenId`

**Nguyên nhân:** AWS credentials sai hoặc thiếu

**Cách fix:**
1. Check Railway → API Service → Variables:
   - [ ] `AWS_ACCESS_KEY_ID` có đúng không?
   - [ ] `AWS_SECRET_ACCESS_KEY` có đúng không?
   - [ ] Không có typo hoặc whitespace?

2. Check AWS IAM:
   - [ ] IAM user có tồn tại không?
   - [ ] Access key có bị disabled không?
   - [ ] Policy có permission cho SES không?

3. Temporary fix để test:
   ```bash
   # Set console mode để test
   EMAIL_PROVIDER=console
   ```

---

### Nếu gặp lỗi `MessageRejected`

**Nguyên nhân:** Email chưa được verify trong SES

**Cách fix:**
1. Check AWS SES → Verified identities:
   - [ ] Domain `anyrent.shop` có trong list không?
   - [ ] Status = "Verified" (không phải "Pending")
   - [ ] Email `noreply@anyrent.shop` có trong verified list không?

2. Check email trong verified list:
   - [ ] AWS SES → Verified identities
   - [ ] Verify từng email một (nếu dùng email, không phải domain)

3. Nếu dùng domain verification:
   - [ ] DNS records đã được thêm chưa?
   - [ ] DNS records đã propagate chưa? (wait 5-10 phút)

---

### Nếu gặp lỗi `AccessDenied`

**Nguyên nhân:** IAM user không có permission

**Cách fix:**
1. Check IAM Policy:
   - [ ] Policy có action `ses:SendEmail`?
   - [ ] Policy có action `ses:SendRawEmail`?
   - [ ] Resource = `*` hoặc specific SES resource?

2. Attach correct policy:
   ```bash
   # Attach AmazonSESFullAccess policy
   # Hoặc custom policy với permissions trên
   ```

---

## 📊 **7. MONITORING**

### Check Logs trên Railway

**Log messages mong đợi (Success):**
```
📧 [Email Service] Sending email: { to: '...', subject: '...', provider: 'ses' }
🔧 [Email Service - SES] Initializing AWS SES client...
📤 [Email Service - SES] Sending email via AWS SES...
✅ [Email Service - SES] Email sent successfully: { messageId: '...' }
```

**Log messages lỗi:**
```
❌ [Email Service - SES] AWS credentials not configured...
❌ [Email Service - SES] Error: InvalidClientTokenId...
❌ [Email Service - SES] Error: MessageRejected...
❌ [Email Service - SES] Error: AccessDenied...
```

### Check AWS SES Dashboard

**Metrics:**
- Send attempts: Should increase after sending
- Bounce rate: Should be 0%
- Complaint rate: Should be 0%
- Reputation: Should be "Good"

---

## 📝 **8. SUMMARY - Quick Setup**

### **Option 1: Development/Testing (Console Mode)**

```env
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@localhost
ENABLE_EMAIL_VERIFICATION=true
```

**✅ Pros:**
- Không cần AWS credentials
- Email được log ra console
- Phù hợp cho testing

**❌ Cons:**
- Không gửi email thật
- Chỉ dùng cho development

---

### **Option 2: Production (AWS SES)**

```env
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@anyrent.shop
AWS_ACCESS_KEY_ID=AKIAxxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_SES_REGION=ap-southeast-1
ENABLE_EMAIL_VERIFICATION=true
```

**✅ Prerequisites:**
1. Domain `anyrent.shop` verified trong AWS SES
2. DNS records (DKIM, SPF) đã thêm
3. Production access approved
4. IAM user với SES permissions

**✅ Pros:**
- Gửi email thật
- 62,000 emails free/month
- Rẻ khi scale ($0.10/1,000 emails)
- Professional & reliable

**❌ Cons:**
- Cần AWS account
- Setup phức tạp hơn

---

## 🎯 **9. NEXT STEPS**

1. **Complete checklist above** ⬆️
2. **Update Railway environment variables**
3. **Test with console mode** để verify không có lỗi code
4. **Setup AWS SES** nếu muốn gửi email thật
5. **Test with SES mode** để verify email được gửi
6. **Monitor logs** trên Railway để check errors
7. **Check AWS SES dashboard** để verify metrics

---

## 📚 **10. REFERENCE DOCUMENTS**

- 📖 `AWS_SES_SETUP.md` - Hướng dẫn setup AWS SES chi tiết
- 📖 `EMAIL_SETUP_GUIDE.md` - Quick guide setup email
- 📖 `AWS_SES_NOREPLY_SETUP.md` - Setup noreply email
- 📖 `EMAIL_VERIFICATION_SETUP.md` - Setup email verification flow
- 📖 `EMAIL_VERIFICATION_FLOW_REVIEW.md` - Review flow
- 📖 `EMAIL_PROVIDERS_COMPARISON.md` - Compare providers
- 📖 `EMAIL_PROVIDER_RECOMMENDATION.md` - Recommendations

---

## ❓ **11. COMMON QUESTIONS**

**Q: Tại sao phải dùng EMAIL_PROVIDER=console trong development?**
A: Vì trong development, bạn chưa cần AWS credentials. Console mode sẽ log email ra console để bạn debug.

**Q: Làm sao biết domain đã được verify?**
A: Check AWS SES → Verified identities → Status phải là "Verified" (không phải "Pending").

**Q: DNS records mất bao lâu để propagate?**
A: Thông thường 5-10 phút, đôi khi lên đến 24 giờ.

**Q: Tại sao cần production access?**
A: Sandbox mode chỉ cho gửi đến verified emails và 200 emails/ngày. Production mode cho gửi đến bất kỳ email nào và unlimited quota.

**Q: Có thể dùng AWS credentials của S3 không?**
A: Có, miễn là IAM user có cả S3 và SES permissions.

---

## ✅ **CHECKLIST SUMMARY**

**Quick check để email verification hoạt động:**

- [ ] Railway: `EMAIL_PROVIDER` = `ses` hoặc `console`
- [ ] Railway: `EMAIL_FROM` = email từ domain đã verify
- [ ] Railway: `ENABLE_EMAIL_VERIFICATION` = `true`
- [ ] AWS: Domain `anyrent.shop` verified trong SES
- [ ] AWS: DNS records (DKIM, SPF) đã thêm
- [ ] AWS: Production access approved (nếu dùng SES mode)
- [ ] AWS: IAM user có SES permissions
- [ ] Railway: `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY` set đúng
- [ ] Railway: `AWS_SES_REGION` match với region verify domain

**Done! ✨**

