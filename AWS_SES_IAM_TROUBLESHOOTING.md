# 🔧 AWS SES IAM Troubleshooting Guide

## ❌ **Lỗi hiện tại**

```json
{
    "success": false,
    "code": "EMAIL_SEND_FAILED",
    "message": "AWS SES error (InvalidClientTokenId): The security token included in the request is invalid.",
}
```

**Nguyên nhân:** AWS credentials không hợp lệ hoặc thiếu quyền SES

---

## ✅ **Có thể dùng chung AWS credentials với S3**

**KHÔNG CẦN** tạo IAM user riêng cho SES. **CÓ THỂ** dùng chung credentials với S3, **NHƯNG** IAM user phải có cả S3 và SES permissions.

---

## 🔑 **BƯỚC 1: Kiểm tra IAM User có quyền SES**

### Trên AWS Console

1. Vào **IAM** → **Users**
2. Tìm IAM user đang dùng cho S3 (username của bạn)
3. Click vào user đó
4. Click tab **Permissions**
5. Kiểm tra policies:

**✅ Phải có một trong các policies:**
- `AmazonSESFullAccess` (full quyền)
- Custom policy với SES permissions

**❌ Nếu chỉ có:**
- `AmazonS3FullAccess` → **Thiếu SES permissions!**

### ❌ **Nếu thiếu SES permissions:**

**Option 1: Attach thêm AmazonSESFullAccess** (Đơn giản nhất)
1. Click **Add permissions** → **Attach policies directly**
2. Search: `AmazonSESFullAccess`
3. Check vào policy
4. Click **Add permissions**

**Option 2: Tạo custom policy** (Restricted permissions)
1. IAM → **Policies** → **Create policy**
2. Click **JSON** tab
3. Paste policy sau:

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
6. Về lại **IAM → Users** → Click user của bạn
7. Click **Add permissions** → **Attach policies directly**
8. Search: `RentalShopSESPermissions`
9. Check và **Add permissions**

---

## 🔑 **BƯỚC 2: Kiểm tra AWS Credentials đúng**

### Trên Railway Dashboard → API Service → Variables

**Kiểm tra các biến sau:**

| Variable | Expected | Check |
|----------|----------|-------|
| `AWS_ACCESS_KEY_ID` | Bắt đầu bằng `AKIA...` (20 chars) | ✅ |
| `AWS_SECRET_ACCESS_KEY` | Random string (40 chars) | ✅ |
| `EMAIL_PROVIDER` | `ses` | ✅ |
| `AWS_SES_REGION` | `ap-southeast-1` hoặc `us-east-1` | ✅ |

### ⚠️ **Lưu ý:**

1. Không có trailing spaces
2. Không có typo
3. Không thiếu ký tự
4. Cả 2 keys từ cùng 1 IAM user

### Kiểm tra nhanh:

Copy `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY` từ Railway, so sánh với AWS Console:

1. IAM → Users → Click user của bạn
2. Click **Security credentials** tab
3. Tìm **Access keys** section
4. Click **Show** để xem secret key
5. So sánh với values trên Railway

**Nếu không khớp:**
- Key có thể đã bị rotate (đổi key mới)
- Key có thể đã bị deactivated

**Cách fix:** Tạo access key mới và update trên Railway

---

## 🧪 **BƯỚC 3: Test AWS Credentials**

### Test trực tiếp với AWS CLI

Nếu bạn có AWS CLI installed:

```bash
# Configure credentials
aws configure

# Test SES access
aws ses get-send-quota --region ap-southeast-1

# Nếu thành công, sẽ thấy:
# {
#   "Max24HourSend": 200.0,
#   "MaxSendRate": 1.0,
#   "SentLast24Hours": 0.0
# }
```

### Test với curl (No AWS CLI needed)

```bash
# Get AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="ap-southeast-1"

# Test với AWS SES API
curl -X POST https://email.ap-southeast-1.amazonaws.com/ \
  -H "Content-Type: application/x-amz-json-1.0" \
  -H "X-Amz-Target: AWSSimpleEmailServiceV2.GetAccount" \
  -H "Authorization: AWS4-HMAC-SHA256 ..."
```

**Nếu lỗi authentication** → Credentials sai hoặc thiếu permissions

---

## 🌍 **BƯỚC 4: Kiểm tra Region**

**Lỗi `InvalidClientTokenId` cũng có thể xảy ra khi region sai!**

### Trên Railway

Check `AWS_SES_REGION` phải khớp với region bạn verify domain trong SES:

| Location | Recommended Region |
|----------|-------------------|
| Việt Nam | `ap-southeast-1` (Singapore) |
| US | `us-east-1` (N. Virginia) |
| Europe | `eu-west-1` (Ireland) |

### Trên AWS Console

1. Vào **Amazon SES**
2. **Quan trọng:** Check **region selector** ở góc trên bên phải
3. Verify domain `anyrent.shop` ở đúng region này
4. **PHẢI KHỚP** với `AWS_SES_REGION` trên Railway

**⚠️ Region mismatch → `InvalidClientTokenId` error!**

---

## 🔍 **BƯỚC 5: Debug step-by-step**

### 1. Kiểm tra credentials có được load không

Vào Railway logs và tìm:

```
❌ [Email Service - SES] AWS credentials not configured...
```

**Nếu thấy lỗi này** → `AWS_ACCESS_KEY_ID` hoặc `AWS_SECRET_ACCESS_KEY` chưa được set trên Railway

### 2. Kiểm tra SES client có được init không

Tìm log:

```
🔧 [Email Service - SES] Initializing AWS SES client...
```

**Nếu KHÔNG thấy** → Credentials check failed ở bước 1

**Nếu thấy** → Credentials passed, lỗi ở API call

### 3. Kiểm tra error code chi tiết

Tìm log:

```
❌ [Email Service - SES] Error: {
  message: "...",
  code: "InvalidClientTokenId"
}
```

### Common Error Codes:

| Error Code | Nguyên nhân | Fix |
|------------|-------------|-----|
| `InvalidClientTokenId` | Credentials sai hoặc region sai | Check credentials + region |
| `MessageRejected` | Email chưa verify trong SES | Verify email/domain |
| `AccessDenied` | Thiếu IAM permissions | Add SES permissions |
| `InvalidParameterValue` | Email format sai | Check EMAIL_FROM |
| `Throttling` | Quá nhiều requests | Wait and retry |

---

## 🛠️ **SOLUTION CHECKLIST**

- [ ] **IAM User có quyền SES** (check IAM → Users → Permissions)
- [ ] **AWS_ACCESS_KEY_ID đúng** (verify với AWS Console)
- [ ] **AWS_SECRET_ACCESS_KEY đúng** (verify với AWS Console)
- [ ] **Không có trailing spaces** trong credentials
- [ ] **Region khớp** (Railway `AWS_SES_REGION` = SES console region)
- [ ] **Email provider = ses** (không phải console)
- [ ] **Domain verified** trong SES (status = "Verified")
- [ ] **Production access** approved (không ở Sandbox)

---

## 🎯 **QUICK FIX: Attach SES Permissions**

### Cách nhanh nhất:

1. **AWS Console** → **IAM** → **Users**
2. Click vào IAM user của bạn
3. Click **Add permissions** → **Attach policies directly**
4. Search: **`AmazonSESFullAccess`**
5. Check vào policy
6. Click **Add permissions**
7. **Wait 1-2 minutes** cho permissions propagate
8. Test lại trên Railway

---

## 🧪 **Test sau khi fix**

1. Set trên Railway: `EMAIL_PROVIDER=ses`
2. Wait 2 phút cho deploy
3. Test resend verification API
4. Check logs Railway:

**✅ Success:**
```
🔧 [Email Service - SES] Initializing AWS SES client...
📤 [Email Service - SES] Sending email via AWS SES...
✅ [Email Service - SES] Email sent successfully
```

**❌ Still failing:**
```
❌ [Email Service - SES] Error: InvalidClientTokenId
```

→ Repeat checklist above

---

## 📞 **Nếu vẫn không work**

### Double-check list:

1. Credentials chính xác copy/paste từ AWS Console?
2. IAM user có policy `AmazonSESFullAccess`?
3. Region đúng với region verify domain?
4. Domain `anyrent.shop` verified trong SES?
5. Production access approved?
6. Railway variables saved và service redeployed?

### Get help:

Check AWS SES console → Account Dashboard:
- ✅ Sending quota = 200/day → **Sandbox mode** (normal, phải request production)
- ✅ Sending quota > 200/day → **Production mode** (ready to send)

---

## 🔗 **Reference**

- [AWS SES IAM Policies](https://docs.aws.amazon.com/ses/latest/dg/access-policy-language-examples.html)
- [AWS SES Getting Started](https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

