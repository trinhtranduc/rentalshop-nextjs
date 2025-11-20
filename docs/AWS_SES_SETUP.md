# 🚀 AWS SES Setup Guide cho AnyRent

## 💡 Tại sao AWS SES phù hợp với bạn?

✅ **Đã có AWS Account** - Đang dùng S3 rồi  
✅ **Railway = EC2 Instance** - Đủ điều kiện free tier 62,000 emails/tháng  
✅ **Rẻ nhất khi scale** - $0.10 cho 1,000 emails  
✅ **Unified AWS Ecosystem** - Tất cả trong 1 account  
✅ **No vendor lock-in** - Standard AWS service  

## 💰 **So sánh Cost**

| Provider | Free Tier | Cost sau free (1,000 emails) |
|----------|-----------|------------------------------|
| **AWS SES** | 62,000/tháng* | **$0.10** ⭐ Rẻ nhất |
| Brevo | 9,000/tháng | $1.25 |
| Resend | 3,000/tháng | $0.67 |
| Mailgun | 5,000/tháng | $0.70 |

*Nếu deploy trên Railway/EC2 (bạn đang dùng Railway!)

### Tính toán cho 10,000 emails/tháng:
- **AWS SES**: FREE (trong free tier) → **$0.00** 🎉
- **Brevo**: FREE (9,000 free) → **$0.13** (1,000 x $0.00125)
- **Resend**: $7.00 (7,000 x $0.001)

### Tính toán cho 50,000 emails/tháng:
- **AWS SES**: $4.40 (43,000 emails x $0.0001) 🎉
- **Brevo**: $51.25 ($25/month + 40,000 x $0.00125)
- **Resend**: $20.00/month

## 🎯 **Kết luận: AWS SES rẻ nhất khi scale!**

---

## 📋 **Setup AWS SES**

### **Bước 1: Navigate to Amazon SES**

**Cách 1: Direct Link (Nhanh nhất)**
- Vào trực tiếp: https://console.aws.amazon.com/ses/home

**Cách 2: Từ AWS Console**
1. Đăng nhập [AWS Console](https://console.aws.amazon.com)
2. Ở search bar trên cùng, gõ: **"SES"** hoặc **"Simple Email Service"**
3. Click vào **Amazon SES** service (không phải Verified Permissions hay Cognito)
4. **Quan trọng**: Phải chọn **region** trước (ví dụ: `us-east-1` hoặc `ap-southeast-1`)

**⚠️ Lưu ý**: 
- "Verified identities" CHỈ có trong **Amazon SES** service
- KHÔNG có trong general AWS console search
- Phải vào đúng service **Amazon SES** (Simple Email Service)

### **Bước 2: Verify Domain trong SES**

Bạn đang ở trang "Get set up". Có 2 cách:

**Cách 1: Dùng Setup Wizard (Dễ nhất)** ⭐

**Step 1: Add your email address**

Đây là email của **BẠN** (để AWS verify bạn là owner), KHÔNG phải email từ domain `anyrent.shop`.

**Bạn có thể nhập:**
- ✅ Email cá nhân của bạn (ví dụ: `yourname@gmail.com`)
- ✅ Email work của bạn (ví dụ: `yourname@company.com`)
- ✅ Bất kỳ email nào bạn có quyền truy cập

**Lưu ý:**
- Email này chỉ để AWS verify identity của bạn
- **KHÔNG** phải email từ domain `anyrent.shop`
- AWS sẽ gửi verification link đến email này
- Bạn cần click link trong email để verify

**Sau khi nhập email:**
1. Click **"Next"** button
2. AWS sẽ gửi verification email
3. Check inbox và click verification link
4. Sau đó đến **Step 2: Add your sending domain** ← Đây mới là nơi bạn nhập `anyrent.shop`

**Step 2: Add your sending domain** (Bạn đang ở đây!)

Đây là nơi bạn nhập domain `anyrent.shop`.

**Thực hiện:**
1. Trong field "Domain name", nhập: `anyrent.shop`
   - ✅ **Đúng**: `anyrent.shop`
   - ❌ **Sai**: `www.anyrent.shop` (không cần www)
   - ❌ **Sai**: `http://anyrent.shop` (không cần http://)
   - ❌ **Sai**: `https://anyrent.shop` (không cần https://)

2. Check các options (nếu có):
   - ✅ **Generate DKIM settings** - Bật (để verify domain)
   - ✅ **Easy DKIM** - Chọn nếu có option này

3. Click **"Next"** hoặc **"Create identity"**

**Sau khi click Next:**
- AWS sẽ hiển thị DNS records cần thêm vào domain
- Bao gồm:
  - **DKIM Records** (3 CNAME records)
  - **SPF Record** (1 TXT record)
  - Có thể có **DMARC Record** (optional)

**Lưu ý:**
- Domain này (`anyrent.shop`) sẽ được dùng để gửi email từ ứng dụng
- Email sẽ từ: `noreply@anyrent.shop`, `support@anyrent.shop`, etc.
- Bạn cần có quyền edit DNS của domain này

**Step 3: Deliverability enhancements (OPTIONAL)** - Bạn đang ở đây!

Đây là step **OPTIONAL** - bạn có thể bật hoặc bỏ qua.

**Các tính năng có sẵn:**

1. **Virtual Deliverability Manager** (Đã bật - tốt!)
   - ✅ Tự động chọn IP tối ưu để gửi email
   - ✅ Insights về delivery, bounce, open rates
   - ✅ Recommendations để cải thiện deliverability
   - **Giữ bật** (toggle ON) - Recommended!

2. **Track opens and clicks** (Đã bật - tốt!)
   - ✅ Track khi người dùng mở email
   - ✅ Track khi người dùng click links
   - **Giữ bật** (toggle ON) - Hữu ích cho analytics!

3. **Optimized shared delivery**
   - ✅ Tự động enabled
   - Giúp giảm spam rate

**Next Steps:**

1. **Giữ các settings hiện tại** (đã bật sẵn - tốt!)
2. Click **"Next"** button để tiếp tục

**Hoặc:**
- Nếu không muốn dùng các tính năng này, bạn có thể tắt và click Next
- **Khuyến nghị**: Giữ bật tất cả - chúng giúp email deliver tốt hơn!

**Sau khi click Next:**
- Step 4: Create Dedicated IP pool (optional) - Có thể skip
- Step 5: Add tenant management (optional) - Có thể skip
- Step 6: Review and get started - Review và hoàn tất

**⚠️ QUAN TRỌNG: Sau khi hoàn tất wizard, bạn cần thêm DNS records vào domain provider!**

**Cách 2: Vào Verified identities trực tiếp** (Nhanh hơn)
1. Click **"Cancel"** button ở wizard
2. Trong menu bên trái của SES console, click **"Verified identities"**
3. Click button **"Create identity"**
4. Chọn **"Domain"** (không phải Email)
5. Nhập: `anyrent.shop`
6. Click **"Create identity"**

**Sau khi vào Amazon SES (không phải wizard):**

1. Chọn region: `us-east-1` (rẻ nhất) hoặc `ap-southeast-1` (gần Việt Nam)
   - Region selector ở góc trên bên phải
2. Trong menu bên trái, click **Verified identities**
   - Hoặc vào tab **Verified identities** ở trên
3. Click button **Create identity**
4. Chọn **Domain** → Nhập `anyrent.shop`
5. Click **Create identity**

**Screenshot guide:**

Khi bạn vào Amazon SES service, bạn sẽ thấy:
- **Dashboard** (trang chủ)
- Menu bên trái có:
  - ✅ **Verified identities** ← Đây là nơi bạn cần vào!
  - Configuration sets
  - Sending statistics
  - etc.

Nếu vẫn không thấy, có thể:
1. **SES chưa được enable** trong region đó
2. Bạn đang ở region không có SES
3. **Thử region khác**: `us-east-1` (N. Virginia) hoặc `ap-southeast-1` (Singapore)

### **Bước 3: Hoàn tất Setup Wizard**

Sau Step 3, bạn sẽ đến:
- **Step 4**: Create Dedicated IP pool (optional) → **Skip** hoặc click Next
- **Step 5**: Add tenant management (optional) → **Skip** hoặc click Next  
- **Step 6**: Review and get started → **Review** và click **"Get started"** hoặc **"Complete setup"**

Sau khi hoàn tất wizard, bạn sẽ được redirect về SES console.

### **Bước 4: Thêm DNS Records (QUAN TRỌNG!)**

**Đây là bước QUAN TRỌNG NHẤT** - không làm bước này thì domain chưa được verify!

Bạn đang ở SES Dashboard và thấy domain `anyrent.shop` với status **"Verification pending"**.

**Thực hiện ngay:**

1. Tìm card **"Verify sending domain"** với domain `anyrent.shop`
2. Click button **"Get DNS Records"** (button lớn, dễ thấy)
3. AWS sẽ hiển thị popup/modal với các DNS records cần thêm

**Hoặc cách khác:**

1. Click **"Verified identities"** trong menu bên trái
2. Tìm domain `anyrent.shop` trong list
3. Click vào domain đó
4. Tab **"DNS records"** sẽ hiển thị các records

**DNS Records bạn sẽ thấy:**

**AWS sẽ cung cấp DNS records cần thêm vào domain:**

**DKIM Records** (3 records):
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

**Lưu ý:** Thêm tất cả records vào DNS provider (Namecheap, GoDaddy, etc.)

### **Bước 5: Request Production Access (Sau khi verify domain)**

**⚠️ QUAN TRỌNG:** Bạn đang ở **Sandbox mode** (thấy trong dashboard):
- ❌ **Daily sending quota: 200 emails/24h**
- ❌ **Max send rate: 1 email/second**
- ❌ Chỉ gửi được đến **verified emails**
- ✅ Free nhưng **rất hạn chế**

**Sau khi domain được verify** (sau bước 4), bạn cần request production access:

AWS SES bắt đầu ở **Sandbox mode**:
- ❌ Chỉ gửi được đến verified emails
- ✅ Free nhưng hạn chế

**Request Production Access:**

**Cách 1: Từ Dashboard (Nhanh nhất)**
1. Trong dashboard, tìm task **"Request production access"**
2. Click button trong task đó

**Cách 2: Từ Account Dashboard**
1. Click **"Account dashboard"** trong menu bên trái
2. Tìm section **"Sending limits"** hoặc **"Account status"**
3. Click **"Request production access"** hoặc **"Edit your account details"**

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
- **Expected volume**: 10,000/month (tùy nhu cầu, có thể tăng sau)
- **Bounce and complaint rates**: 0% (target)

**Submit và đợi approval:**
- ⏱️ Thường mất **24-48 giờ**
- AWS sẽ review request
- Bạn sẽ nhận email khi được approve

**Sau khi được approve:**
- ✅ Tăng daily quota (có thể lên đến 50,000/day)
- ✅ Tăng send rate (có thể lên đến 14 emails/second)
- ✅ Có thể gửi đến bất kỳ email nào (không cần verify)

### **Bước 4: Tạo IAM User cho SES**

1. Vào **IAM** service
2. Click **Users** → **Create user**
3. Username: `rentalshop-ses-user`
4. Attach policy: `AmazonSESFullAccess`
5. Tạo **Access Key** và **Secret Key**

**Lưu ý:** Có thể dùng chung IAM user với S3 nếu muốn!

### **Bước 5: Cấu hình Environment Variables**

Thêm vào Railway environment variables:

```env
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@anyrent.shop
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-existing-access-key  # Có thể dùng chung với S3
AWS_SECRET_ACCESS_KEY=your-existing-secret-key  # Có thể dùng chung với S3
```

**Quan trọng:** Bạn đã có `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY` rồi (từ S3 setup)! Có thể dùng lại credentials đó.

---

## ⚠️ **Lưu ý về Railway và Free Tier**

### **Railway có được tính là EC2 không?**

Theo AWS SES documentation:
- ✅ Free tier 62,000 emails/tháng áp dụng cho:
  - EC2 instances
  - Lambda functions
  - Elastic Beanstalk
  - **Any compute resource running on AWS**

### **Railway không phải AWS Service**

⚠️ **Railway KHÔNG phải EC2**, nên:
- ❌ KHÔNG đủ điều kiện free tier 62,000/month
- ✅ Chỉ có free tier **1,000 emails/tháng** (standard free tier)

**Kết luận:** 
- Railway → Free tier: **1,000 emails/tháng**
- Sau đó: **$0.10 cho 1,000 emails** (rất rẻ!)

### **So sánh lại với Railway:**

| Provider | Free Tier (Railway) | Cost 10,000/month |
|----------|---------------------|-------------------|
| **AWS SES** | 1,000/tháng | **$0.90** ⭐ |
| **Brevo** | 9,000/tháng | **$0.13** ⭐ (free tier lớn hơn) |
| Resend | 3,000/tháng | $7.00 |

**Với Railway, Brevo có free tier lớn hơn!**

---

## 🎯 **Khuyến nghị cho Railway Setup**

### **Option 1: Brevo (Khuyến nghị cho Railway)**
- ✅ Free tier: **9,000 emails/tháng** (lớn nhất)
- ✅ Setup đơn giản hơn SES
- ✅ Có dashboard analytics
- ✅ Cost 10,000/month: **$0.13**

### **Option 2: AWS SES**
- ✅ Dùng chung AWS account với S3
- ✅ Unified ecosystem
- ✅ Rẻ nhất khi scale lớn (>50,000/month)
- ❌ Free tier nhỏ: 1,000/tháng (với Railway)
- ❌ Setup phức tạp hơn (verify domain, production access)

---

## 🔄 **Decision Matrix**

### **Chọn Brevo nếu:**
- ✅ Cần free tier lớn (9,000/month)
- ✅ Muốn setup nhanh
- ✅ Volume < 50,000 emails/tháng

### **Chọn AWS SES nếu:**
- ✅ Đã verify domain trong SES
- ✅ Muốn unified AWS ecosystem
- ✅ Volume > 50,000 emails/tháng
- ✅ Cần control chi tiết

---

## 📝 **Next Steps**

Bạn muốn:
1. ✅ **Thêm Brevo** (free tier lớn nhất, setup đơn giản) - **Khuyến nghị**
2. 🔄 **Thêm AWS SES** (unified với S3, rẻ khi scale)
3. 🔄 **Cả hai** (Brevo primary, SES fallback)

**Khuyến nghị:** Thêm **Brevo** vì free tier 9,000/tháng lớn nhất và setup đơn giản hơn!

