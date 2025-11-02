# So sánh Email Service Providers (Free Tier)

## 🏆 Top Recommendations cho Free Tier

### 1. **Resend** (Đã tích hợp) ⭐⭐⭐⭐⭐
**Free Tier:**
- ✅ 3,000 emails/tháng
- ✅ 100 emails/ngày
- ✅ Unlimited domains
- ✅ API-based
- ✅ Excellent deliverability

**Ưu điểm:**
- ✅ Setup đơn giản nhất
- ✅ Developer-friendly API
- ✅ Built-in domain verification
- ✅ Real-time analytics
- ✅ DKIM/SPF tự động

**Nhược điểm:**
- ❌ Free tier giới hạn 100 emails/ngày
- ❌ Không có SMTP (chỉ API)

**Giá sau free:**
- $20/tháng cho 50,000 emails

---

### 2. **Brevo (Sendinblue)** ⭐⭐⭐⭐
**Free Tier:**
- ✅ 300 emails/ngày
- ✅ 9,000 emails/tháng
- ✅ Unlimited contacts
- ✅ Transactional & Marketing emails

**Ưu điểm:**
- ✅ Free tier lớn nhất (300/day)
- ✅ Có cả Transactional và Marketing
- ✅ SMTP + API
- ✅ Email templates
- ✅ Analytics dashboard
- ✅ A/B testing

**Nhược điểm:**
- ❌ UI phức tạp hơn Resend
- ❌ Email verification domain phức tạp hơn
- ❌ Có thể bị rate limit

**Giá sau free:**
- $25/tháng cho 20,000 emails

**Setup Difficulty:** Medium

---

### 3. **Mailgun** ⭐⭐⭐⭐
**Free Tier:**
- ✅ 5,000 emails/tháng (3 tháng đầu)
- ✅ Sau đó: 1,000 emails/tháng
- ✅ 3 months free trial

**Ưu điểm:**
- ✅ Reputation tốt cho deliverability
- ✅ Powerful API
- ✅ Webhooks
- ✅ Email validation
- ✅ SMTP + API

**Nhược điểm:**
- ❌ Free tier giảm sau 3 tháng (1,000/month)
- ❌ Setup phức tạp hơn

**Giá sau free:**
- $35/tháng cho 50,000 emails

**Setup Difficulty:** Medium-Hard

---

### 4. **SendGrid** ⭐⭐⭐
**Free Tier:**
- ✅ 100 emails/ngày
- ✅ 3,000 emails/tháng
- ✅ SMTP + API
- ✅ Email templates

**Ưu điểm:**
- ✅ Owned by Twilio (reliable)
- ✅ SMTP + API support
- ✅ Good documentation
- ✅ Email templates

**Nhược điểm:**
- ❌ Free tier nhỏ (100/day)
- ❌ UI phức tạp
- ❌ Domain verification khó

**Giá sau free:**
- $19.95/tháng cho 50,000 emails

**Setup Difficulty:** Medium-Hard

---

### 5. **Amazon SES** ⭐⭐⭐⭐
**Free Tier:**
- ✅ 62,000 emails/tháng (nếu chạy trên EC2)
- ✅ 1,000 emails/tháng (nếu không dùng EC2)
- ✅ Pay-as-you-go sau free tier

**Ưu điểm:**
- ✅ Free tier cực lớn nếu dùng EC2
- ✅ Rẻ nhất khi scale ($0.10 cho 1,000 emails)
- ✅ Highly scalable
- ✅ AWS ecosystem

**Nhược điểm:**
- ❌ Setup phức tạp nhất
- ❌ Cần AWS account
- ❌ Sandbox mode ban đầu (cần verify)
- ❌ Không có dashboard đẹp

**Giá sau free:**
- $0.10 cho 1,000 emails (rất rẻ!)

**Setup Difficulty:** Hard

---

### 6. **Postmark** ⭐⭐⭐⭐
**Free Tier:**
- ✅ 100 emails/tháng
- ✅ Unlimited domains

**Ưu điểm:**
- ✅ Deliverability tốt nhất (98%+)
- ✅ Focus on transactional emails
- ✅ Excellent API
- ✅ Email templates
- ✅ Inbound email handling

**Nhược điểm:**
- ❌ Free tier nhỏ nhất (100/month)
- ❌ Chỉ transactional, không marketing

**Giá sau free:**
- $15/tháng cho 10,000 emails

**Setup Difficulty:** Easy

---

### 7. **Nodemailer với Gmail/Outlook SMTP** ⭐⭐⭐
**Free Tier:**
- ✅ Unlimited (với giới hạn của Gmail/Outlook)
- ✅ Gmail: 500 emails/ngày
- ✅ Outlook: 300 emails/ngày

**Ưu điểm:**
- ✅ Hoàn toàn free
- ✅ Setup đơn giản
- ✅ Không cần verify domain

**Nhược điểm:**
- ❌ Không professional (từ Gmail/Outlook address)
- ❌ Giới hạn bởi provider
- ❌ Có thể bị spam
- ❌ Không phù hợp production

**Setup Difficulty:** Easy (nhưng không recommended cho production)

---

## 📊 Bảng so sánh nhanh

| Provider | Free Tier | Daily Limit | Best For | Setup |
|----------|-----------|-------------|----------|-------|
| **Resend** | 3,000/month | 100/day | ⭐⭐⭐⭐⭐ Startup/App | Easy |
| **Brevo** | 9,000/month | 300/day | ⭐⭐⭐⭐⭐ Small business | Medium |
| **Mailgun** | 5,000→1,000/month | ~33/day | ⭐⭐⭐⭐ Enterprise | Medium |
| **SendGrid** | 3,000/month | 100/day | ⭐⭐⭐ General purpose | Medium |
| **AWS SES** | 62,000/month* | Unlimited* | ⭐⭐⭐⭐⭐ Scale lớn | Hard |
| **Postmark** | 100/month | ~3/day | ⭐⭐⭐⭐ Quality | Easy |
| **Gmail SMTP** | 500/day | 500/day | ⭐⭐ Testing only | Easy |

*Nếu chạy trên EC2

---

## 🎯 Khuyến nghị theo use case

### **Nếu bạn cần FREE TIER LỚN NHẤT:**
1. **Brevo** - 300 emails/ngày (9,000/month) ⭐
2. **Mailgun** - 5,000/month (3 tháng đầu)
3. **AWS SES** - 62,000/month (nếu dùng EC2)

### **Nếu bạn cần SETUP ĐỠN GIẢN:**
1. **Resend** - Developer-friendly nhất ⭐
2. **Postmark** - Simple & clean
3. **Brevo** - UI tốt nhưng nhiều features

### **Nếu bạn cần SCALE LỚN SAU NÀY:**
1. **AWS SES** - Rẻ nhất khi scale ⭐
2. **Mailgun** - Good balance
3. **Brevo** - Affordable pricing

### **Nếu bạn cần DELIVERABILITY TỐT NHẤT:**
1. **Postmark** - 98%+ deliverability ⭐
2. **Mailgun** - Enterprise-grade
3. **Resend** - Very good

---

## 💡 Lời khuyên cho dự án của bạn

### **Cho `anyrent.shop` - Rental Shop SaaS:**

**Option 1: Brevo (Khuyến nghị)**
- ✅ 300 emails/ngày đủ cho startup
- ✅ Có cả Transactional và Marketing (gửi email marketing sau này)
- ✅ Free tier lớn nhất
- ⚠️ Setup hơi phức tạp hơn Resend

**Option 2: Resend (Hiện tại)**
- ✅ Đã tích hợp sẵn
- ✅ Setup đơn giản nhất
- ✅ API clean
- ⚠️ Chỉ 100 emails/ngày

**Option 3: AWS SES (Nếu scale lớn)**
- ✅ Free tier 62,000/month nếu deploy lên Railway/EC2
- ✅ Rẻ nhất khi scale
- ⚠️ Setup phức tạp

---

## 🔄 Migration Path

### Nếu chọn **Brevo**:
1. Setup Brevo account
2. Verify domain `anyrent.shop`
3. Add Brevo provider vào email service
4. Update `.env`:
   ```env
   EMAIL_PROVIDER=brevo
   BREVO_API_KEY=xxxxxxxx
   EMAIL_FROM=noreply@anyrent.shop
   ```

### Nếu chọn **AWS SES**:
1. Setup AWS account
2. Verify domain trong SES
3. Request production access (out of sandbox)
4. Add SES provider vào email service
5. Update `.env`:
   ```env
   EMAIL_PROVIDER=ses
   AWS_SES_REGION=us-east-1
   AWS_ACCESS_KEY_ID=xxxxx
   AWS_SECRET_ACCESS_KEY=xxxxx
   EMAIL_FROM=noreply@anyrent.shop
   ```

---

## 📝 Next Steps

Bạn muốn tôi:
1. ✅ Giữ **Resend** (đã tích hợp, free 3,000/month)
2. 🔄 Thêm **Brevo** (free 9,000/month - lớn nhất)
3. 🔄 Thêm **AWS SES** (free 62,000/month nếu dùng Railway)
4. 🔄 Thêm **Mailgun** (free 5,000/month)
5. 🔄 Thêm **SendGrid** (free 3,000/month)

**Khuyến nghị:** Thêm **Brevo** vì free tier lớn nhất và chất lượng tốt!

