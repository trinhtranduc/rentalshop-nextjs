# 🔧 Fix HTTP 530 Error cho dev-images.anyrent.shop

## ❌ Vấn Đề Hiện Tại

**URL không load được:**
```
https://dev-images.anyrent.shop/products/merchant-17/sea-games-33-u22-viet-nam-vs-u2-thai-lan-1812-1766-1766224173506-p12niq380v.jpg
```

**Error:** HTTP 530 từ Cloudflare

**Nguyên nhân:** 
- DNS record trong Cloudflare đang ở chế độ **"Proxied"** (orange cloud ☁️)
- Cloudflare đang cố proxy traffic nhưng không kết nối được với CloudFront origin
- CloudFront cần kết nối trực tiếp, không qua Cloudflare proxy

## ✅ Giải Pháp: Đổi DNS Record từ "Proxied" sang "DNS only"

### **Bước 1: Vào Cloudflare Dashboard**

1. Đăng nhập: https://dash.cloudflare.com
2. Chọn domain: `anyrent.shop`
3. Vào **DNS** → **Records**

### **Bước 2: Tìm và Sửa CNAME Record**

1. Tìm record có:
   - **Type**: `CNAME`
   - **Name**: `dev-images`
   - **Target**: `d[xxx].cloudfront.net` (CloudFront distribution domain)

2. Click vào record để edit

3. **QUAN TRỌNG:** Đổi **Proxy status**:
   - ❌ **Từ:** "Proxied" (orange cloud ☁️) 
   - ✅ **Sang:** "DNS only" (gray cloud ⚪)

4. Click **Save**

**Screenshot:**
```
Type:     CNAME
Name:     dev-images
Target:   d1234567890.cloudfront.net
Proxy:    ⚪ DNS only  ← ĐỔI TỪ ☁️ Proxied
TTL:      Auto
```

### **Bước 3: Đợi DNS Propagation**

- ⏱️ **Thời gian:** 5-30 phút (có thể lên đến 1 giờ)
- DNS sẽ propagate và trỏ trực tiếp về CloudFront

### **Bước 4: Verify DNS Resolution**

Sau 5-10 phút, test lại:

```bash
# Test DNS resolution
dig dev-images.anyrent.shop

# Hoặc
nslookup dev-images.anyrent.shop
```

**Kết quả mong đợi:**
```
dev-images.anyrent.shop. 300 IN CNAME d1234567890.cloudfront.net.
d1234567890.cloudfront.net has address XXX.XXX.XXX.XXX
```

**KHÔNG còn thấy Cloudflare IPs** (104.21.66.4, 172.67.167.203)

### **Bước 5: Test Image Access**

Sau khi DNS propagate:

```bash
# Test access
curl -I "https://dev-images.anyrent.shop/products/merchant-17/sea-games-33-u22-viet-nam-vs-u2-thai-lan-1812-1766-1766224173506-p12niq380v.jpg"
```

**Kết quả mong đợi:**
```
HTTP/2 200
```

**Không còn HTTP 530**

---

## 🔍 Kiểm Tra Thêm (Nếu Vẫn Lỗi)

### **1. Verify CloudFront Distribution**

1. Vào **AWS Console** → **CloudFront**
2. Tìm distribution cho `anyrent-images-dev`
3. Kiểm tra:
   - ✅ **Status**: "Deployed" (không phải "In Progress")
   - ✅ **Alternate domain names (CNAMEs)**: Phải có `dev-images.anyrent.shop`
   - ✅ **SSL certificate**: Phải có certificate cho `*.anyrent.shop` (status: Issued)

### **2. Verify SSL Certificate**

1. Vào **AWS Console** → **Certificate Manager**
2. **⚠️ Region phải là: US East (N. Virginia) - us-east-1**
3. Kiểm tra certificate cho `*.anyrent.shop`
4. Status phải là **"Issued"**

### **3. Verify S3 Bucket Policy**

1. Vào **AWS Console** → **S3** → `anyrent-images-dev`
2. **Permissions** → **Bucket policy**
3. Kiểm tra policy có cho phép CloudFront access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowCloudFrontServicePrincipal",
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudfront.amazonaws.com"
         },
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::anyrent-images-dev/*",
         "Condition": {
           "StringEquals": {
             "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
           }
         }
       }
     ]
   }
   ```

---

## 🚀 Quick Fix Tạm Thời

**Nếu cần test ngay mà chưa có thời gian fix DNS:**

### **Option 1: Dùng CloudFront Domain Trực Tiếp**

Thay vì dùng `dev-images.anyrent.shop`, dùng CloudFront domain trực tiếp:

```
https://d1234567890.cloudfront.net/products/merchant-17/sea-games-33-u22-viet-nam-vs-u2-thai-lan-1812-1766-1766224173506-p12niq380v.jpg
```

**Cách lấy CloudFront domain:**
1. Vào **AWS Console** → **CloudFront**
2. Tìm distribution cho `anyrent-images-dev`
3. Copy **Distribution domain name**

### **Option 2: Dùng S3 URL Trực Tiếp**

```
https://anyrent-images-dev.s3.ap-southeast-1.amazonaws.com/products/merchant-17/sea-games-33-u22-viet-nam-vs-u2-thai-lan-1812-1766-1766224173506-p12niq380v.jpg
```

**✅ File này đã được verify là hoạt động (HTTP 200)**

---

## 📋 Checklist Hoàn Chỉnh

**DNS Configuration:**
- [ ] Cloudflare DNS record: `dev-images` → CloudFront domain
- [ ] Proxy status: **DNS only** (gray cloud ⚪) - KHÔNG phải Proxied
- [ ] DNS đã propagate (test với `dig` hoặc `nslookup`)
- [ ] DNS resolve về CloudFront domain, không còn Cloudflare IPs

**CloudFront Configuration:**
- [ ] Distribution status: **Deployed**
- [ ] Alternate domain name: `dev-images.anyrent.shop` đã được thêm
- [ ] SSL certificate: **Issued** (region: us-east-1)

**S3 Configuration:**
- [ ] Bucket policy cho phép CloudFront access
- [ ] File tồn tại trong S3: `products/merchant-17/...`

**Testing:**
- [ ] DNS resolution: `dig dev-images.anyrent.shop` → CloudFront domain
- [ ] Image access: `curl -I https://dev-images.anyrent.shop/...` → HTTP/2 200
- [ ] Không còn HTTP 530 error
- [ ] Images hiển thị đúng trong frontend

---

## 🎯 Tóm Tắt

**Vấn đề:** Cloudflare proxy (orange cloud) không tương thích với CloudFront

**Giải pháp:** Đổi DNS record từ "Proxied" sang "DNS only" (gray cloud)

**Thời gian fix:** 5-30 phút (DNS propagation)

**Kết quả:** Images sẽ load được qua `dev-images.anyrent.shop`

---

**Last Updated:** 2025-12-20
**Status:** ✅ File exists in S3, issue is DNS/Cloudflare proxy configuration

