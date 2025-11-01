# 🧭 Hướng dẫn Navigate đến Amazon SES "Verified identities"

## ⚠️ Vấn đề: Không thấy "Verified identities"

Nếu bạn search "Verified identities" trong AWS Console và chỉ thấy:
- Amazon Verified Permissions
- Cognito
- IAM Identity Center

→ **Đây KHÔNG phải là nơi bạn cần!**

---

## ✅ Cách đúng để vào Amazon SES

### **Method 1: Direct Link (Nhanh nhất)** ⭐

1. Vào trực tiếp: **https://console.aws.amazon.com/ses/home**
2. Chọn region ở góc trên bên phải: `us-east-1` (N. Virginia) hoặc `ap-southeast-1` (Singapore)
3. Menu bên trái sẽ có **"Verified identities"** ← Click vào đây!

---

### **Method 2: Từ AWS Console**

1. Đăng nhập [AWS Console](https://console.aws.amazon.com)
2. Ở **search bar trên cùng** (không phải global search), gõ: **"ses"**
3. Trong dropdown results, tìm và click:
   - **Amazon SES** 
   - **Description**: "Send transactional email"
   - **NOT** "Verified Permissions" hay "Cognito"

4. Sau khi vào Amazon SES service:
   - **Chọn region** ở góc trên bên phải (quan trọng!)
   - Menu bên trái sẽ hiện:
     ```
     📊 Dashboard
     ✅ Verified identities  ← Đây!
     📧 Configuration sets
     📈 Sending statistics
     📋 Account dashboard
     ```

---

### **Method 3: Từ Services Menu**

1. Click vào **"Services"** menu (góc trên trái)
2. Scroll xuống section **"Customer Engagement"**
3. Click **"Simple Email Service"** (hoặc search "SES")
4. Chọn region
5. Click **"Verified identities"** trong menu bên trái

---

## 🎯 Screenshot Guide

### Khi vào đúng Amazon SES, bạn sẽ thấy:

```
┌─────────────────────────────────────────────┐
│  AWS Console  [Region: us-east-1 ▼]        │
├─────────────────────────────────────────────┤
│                                             │
│  Amazon Simple Email Service               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🏠 Dashboard                        │   │
│  │ ✅ Verified identities  ← Click!    │   │
│  │ 📧 Configuration sets              │   │
│  │ 📈 Sending statistics              │   │
│  │ 📋 Account dashboard                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Create identity] button                  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ❌ Những gì KHÔNG phải là SES:

### Khi search "verified identities", bạn có thể thấy:

1. ❌ **Amazon Verified Permissions**
   - Description: "Manage, analyze and enforce permissions"
   - **NOT** email service

2. ❌ **Cognito**
   - Description: "Consumer Identity Management"
   - **NOT** email service

3. ❌ **IAM Identity Center**
   - Description: "Manage workforce user access"
   - **NOT** email service

→ Bỏ qua những cái này!

---

## ✅ Dấu hiệu bạn đã vào ĐÚNG:

- ✅ URL có `/ses/home`
- ✅ Title: "Amazon Simple Email Service"
- ✅ Thấy menu "Verified identities" ở bên trái
- ✅ Có button "Create identity"
- ✅ Thấy "Sending statistics" và "Configuration sets"

---

## 🔧 Nếu vẫn không thấy "Verified identities":

### **1. Kiểm tra Region**

SES không có ở tất cả regions. Thử:
- ✅ `us-east-1` (N. Virginia) - **Khuyến nghị**
- ✅ `ap-southeast-1` (Singapore) - Gần Việt Nam
- ✅ `eu-west-1` (Ireland)

**Cách đổi region:**
1. Góc trên bên phải, click vào region selector
2. Chọn region khác
3. Refresh page

### **2. Enable SES trong Region**

1. Vào Amazon SES
2. Click **"Account dashboard"** trong menu trái
3. Nếu thấy "Sandbox mode" → Bạn đã vào đúng service
4. Click **"Verified identities"** ở menu trái

### **3. Kiểm tra Permissions**

Nếu bạn dùng IAM user (không phải root account):
- Cần permission: `ses:ListIdentities` và `ses:GetIdentityVerificationAttributes`
- Hoặc policy: `AmazonSESFullAccess`

---

## 🚀 Quick Start (Copy-paste)

1. **Vào link này trực tiếp:**
   ```
   https://console.aws.amazon.com/ses/home?region=us-east-1
   ```

2. **Chọn region:** `us-east-1` (góc trên phải)

3. **Click "Verified identities"** (menu bên trái)

4. **Click "Create identity"** button

5. **Chọn "Domain"** → Nhập `anyrent.shop`

6. **Done!** ✅

---

## 📞 Still Having Issues?

Nếu vẫn không tìm thấy:
1. Đảm bảo bạn đang dùng **root account** hoặc **IAM user có quyền SES**
2. Thử đổi browser hoặc incognito mode
3. Kiểm tra region có hỗ trợ SES không
4. Thử method **Direct Link** ở trên

**Hoặc sử dụng Brevo** (đơn giản hơn và free tier lớn hơn cho Railway!)

