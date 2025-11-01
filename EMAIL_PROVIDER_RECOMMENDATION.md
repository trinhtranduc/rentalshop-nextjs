# 📧 Email Provider Recommendation cho Railway + AWS Setup

## ✅ Kết luận: Dùng Brevo cho Railway

Vì bạn đang dùng **Railway** (không phải EC2), AWS SES chỉ có **1,000 emails/tháng** free tier, không phải 62,000.

## 📊 So sánh với Railway:

| Provider | Free Tier | Setup | Khuyến nghị |
|----------|-----------|-------|-------------|
| **Brevo** | **9,000/tháng** ⭐ | Dễ | ✅ **Nên dùng** |
| AWS SES | 1,000/tháng | Khó | Chỉ nếu muốn unified AWS |
| Resend | 3,000/tháng | Dễ | Đã có sẵn |

## 🎯 Khuyến nghị:

### **Primary: Brevo** ⭐
- ✅ Free tier lớn nhất: **9,000 emails/tháng**
- ✅ Setup đơn giản hơn AWS SES
- ✅ Cost thấp khi scale: $0.00125/email sau free tier

### **Fallback: Resend** (đã có)
- ✅ Giữ làm backup
- ✅ Free 3,000/month

### **Future: AWS SES** (khi scale lớn >50k/month)
- ✅ Chuyển sang khi cần scale lớn
- ✅ Rẻ nhất khi volume cao

## 🔧 Setup Brevo:

```env
EMAIL_PROVIDER=brevo
EMAIL_FROM=noreply@anyrent.shop
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
CLIENT_URL=https://anyrent.shop
```

1. Đăng ký tại [brevo.com](https://brevo.com) (miễn phí)
2. Lấy API Key từ Settings → SMTP & API
3. Verify domain `anyrent.shop` (optional nhưng recommended)
4. Thêm vào Railway env variables

## ✅ Đã tích hợp:

- ✅ **Brevo** - Free 9,000/month
- ✅ **AWS SES** - Free 1,000/month (dùng chung AWS credentials với S3)
- ✅ **Resend** - Free 3,000/month (đã có sẵn)
- ✅ **Console** - Development mode

Switch provider qua env variable `EMAIL_PROVIDER`!

