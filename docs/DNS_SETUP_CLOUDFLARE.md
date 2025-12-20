# 🌐 DNS Setup cho CloudFront Custom Domain - Cloudflare

## ✅ Xác Nhận Vấn Đề

**Kết quả kiểm tra DNS:**
```bash
dig dev-images.anyrent.shop
# Result: NXDOMAIN - Domain không tồn tại
```

**Nguyên nhân:** DNS CNAME record cho `dev-images.anyrent.shop` chưa được tạo trong Cloudflare.

---

## 🔧 Giải Pháp: Tạo CNAME Record trong Cloudflare

### **Bước 1: Lấy CloudFront Distribution Domain**

1. Vào **AWS Console** → **CloudFront**
2. Tìm distribution cho `anyrent-images-dev` (development bucket)
3. Copy **Distribution domain name**: `d1234567890.cloudfront.net`
   - ⚠️ **Ghi lại domain này** - sẽ dùng để tạo CNAME record

**Hoặc kiểm tra trong code/environment:**
- Distribution domain thường có format: `d[random].cloudfront.net`

---

### **Bước 2: Tạo CNAME Record trong Cloudflare**

1. **Đăng nhập Cloudflare Dashboard**
   - Vào: https://dash.cloudflare.com
   - Chọn domain: `anyrent.shop`

2. **Vào DNS Settings**
   - Click **DNS** → **Records** (sidebar bên trái)

3. **Tạo CNAME Record Mới**
   - Click **Add record**
   - **Type**: Chọn `CNAME`
   - **Name**: `dev-images` (chỉ phần subdomain, không có `.anyrent.shop`)
   - **Target**: `d1234567890.cloudfront.net` (CloudFront distribution domain)
   - **Proxy status**: 
     - ✅ **DNS only** (khuyến nghị - để CloudFront handle SSL)
     - Hoặc **Proxied** (nếu muốn dùng Cloudflare proxy, nhưng có thể conflict với CloudFront)
   - **TTL**: `Auto` hoặc `3600` (1 hour)
   - Click **Save**

**Screenshot Example:**
```
Type:     CNAME
Name:     dev-images
Target:   d1234567890.cloudfront.net
Proxy:    DNS only (gray cloud)
TTL:      Auto
```

---

### **Bước 3: Verify DNS Propagation**

Sau khi tạo record, chờ 1-5 phút rồi test:

```bash
# Test DNS resolution
dig dev-images.anyrent.shop

# Hoặc
nslookup dev-images.anyrent.shop

# Hoặc
host dev-images.anyrent.shop
```

**Expected Result:**
```
dev-images.anyrent.shop is an alias for d1234567890.cloudfront.net.
d1234567890.cloudfront.net has address XXX.XXX.XXX.XXX
```

**Nếu vẫn chưa resolve:**
- Chờ thêm 5-10 phút (DNS propagation có thể mất đến 30 phút)
- Clear DNS cache: `sudo dscacheutil -flushcache` (macOS) hoặc `ipconfig /flushdns` (Windows)

---

### **Bước 4: Verify CloudFront Alternate Domain Name**

**⚠️ QUAN TRỌNG:** CloudFront distribution cũng cần được config với custom domain:

1. Vào **AWS Console** → **CloudFront**
2. Click vào distribution cho `anyrent-images-dev`
3. Tab **General** → Click **Edit**
4. Scroll xuống **Alternate domain names (CNAMEs)**
5. **Kiểm tra:**
   - ✅ Phải có `dev-images.anyrent.shop` trong list
   - ❌ Nếu không có → Cần thêm vào

**Nếu chưa có:**
1. Click **Add item** trong Alternate domain names section
2. Nhập: `dev-images.anyrent.shop`
3. **Custom SSL certificate**: 
   - Chọn certificate cho `*.anyrent.shop` (wildcard)
   - ⚠️ Certificate phải ở region **us-east-1**
4. Click **Save changes**
5. ⏱️ **Đợi CloudFront deploy** (5-15 phút)

---

### **Bước 5: Verify SSL Certificate**

CloudFront cần SSL certificate cho custom domain:

1. Vào **AWS Console** → **Certificate Manager**
2. **⚠️ Region phải là: US East (N. Virginia) - us-east-1**
3. Kiểm tra certificate cho `*.anyrent.shop` hoặc `dev-images.anyrent.shop`
4. Status phải là **"Issued"**

**Nếu chưa có certificate:**
1. Click **Request certificate**
2. **Certificate type**: `Request a public certificate`
3. **Domain names**: 
   - `*.anyrent.shop` (wildcard - recommended)
   - Hoặc `dev-images.anyrent.shop` (specific)
4. **Validation method**: `DNS validation`
5. Click **Request**
6. **Validate certificate**: Thêm DNS records vào Cloudflare (sẽ có hướng dẫn trong AWS Console)
7. ⏱️ Đợi certificate được issued (5-30 phút)

---

### **Bước 6: Test Image Access**

Sau khi DNS và CloudFront đã được config:

```bash
# Test access qua custom domain
curl -I https://dev-images.anyrent.shop/products/merchant-17/test.jpg

# Expected: HTTP/2 200 hoặc HTTP/2 403 (nếu file không tồn tại)
```

**Nếu vẫn lỗi:**
- Check CloudFront distribution status: Phải là **Deployed** (không phải In Progress)
- Check SSL certificate: Phải là **Issued**
- Check DNS: Phải resolve đúng về CloudFront domain

---

## 🚀 Giải Pháp Tạm Thời (Quick Fix)

**Nếu cần test ngay mà chưa có thời gian config DNS:**

### **Option 1: Dùng CloudFront Domain Mặc Định**

1. **Xóa hoặc comment** `AWS_CLOUDFRONT_DOMAIN` trong environment:
   ```bash
   # AWS_CLOUDFRONT_DOMAIN=dev-images.anyrent.shop
   ```

2. **Restart API server**

3. Images sẽ dùng CloudFront domain mặc định:
   ```
   https://d1234567890.cloudfront.net/products/merchant-17/image.jpg
   ```

**✅ Ưu điểm:**
- Hoạt động ngay, không cần DNS
- CloudFront domain luôn hoạt động

**❌ Nhược điểm:**
- URLs dài hơn
- Không có custom domain

### **Option 2: Dùng S3 URL Trực Tiếp (Fallback)**

Code đã có fallback logic - nếu CloudFront không hoạt động, sẽ dùng S3 URL:
```
https://anyrent-images-dev.s3.ap-southeast-1.amazonaws.com/products/merchant-17/image.jpg
```

---

## 📋 Checklist Hoàn Chỉnh

**DNS Configuration:**
- [ ] CloudFront distribution domain đã được lấy: `d1234567890.cloudfront.net`
- [ ] CNAME record đã được tạo trong Cloudflare: `dev-images` → `d1234567890.cloudfront.net`
- [ ] DNS đã propagate (test với `dig` hoặc `nslookup`)
- [ ] Proxy status: **DNS only** (gray cloud)

**CloudFront Configuration:**
- [ ] Distribution status: **Deployed**
- [ ] Alternate domain name: `dev-images.anyrent.shop` đã được thêm
- [ ] SSL certificate đã được chọn và status: **Issued**
- [ ] Certificate ở region: **us-east-1**

**SSL Certificate:**
- [ ] Certificate tồn tại: `*.anyrent.shop` hoặc `dev-images.anyrent.shop`
- [ ] Certificate status: **Issued**
- [ ] Certificate ở region: **us-east-1**

**Testing:**
- [ ] DNS resolution: `dig dev-images.anyrent.shop` → trả về CloudFront domain
- [ ] Image access: `curl -I https://dev-images.anyrent.shop/...` → HTTP/2 200 hoặc 403
- [ ] No SSL warnings trong browser
- [ ] Images hiển thị đúng trong frontend

---

## 🔍 Troubleshooting

### **Issue: DNS vẫn không resolve sau 30 phút**

**Solutions:**
1. Verify CNAME record trong Cloudflare:
   - Name: `dev-images` (không có `.anyrent.shop`)
   - Target: CloudFront domain (đúng format)
   - Proxy: DNS only

2. Clear DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

3. Test với DNS server khác:
   ```bash
   dig @8.8.8.8 dev-images.anyrent.shop
   ```

### **Issue: 403 Forbidden khi access image**

**Causes:**
- CloudFront chưa có alternate domain name
- SSL certificate chưa được config
- Bucket policy không cho phép CloudFront access

**Solutions:**
1. Check CloudFront alternate domain names
2. Check SSL certificate configuration
3. Check S3 bucket policy

### **Issue: SSL Certificate Error**

**Causes:**
- Certificate chưa được validate
- Certificate ở sai region (phải là us-east-1)
- Certificate không bao gồm domain

**Solutions:**
1. Verify certificate ở region **us-east-1**
2. Check certificate includes domain: `*.anyrent.shop` hoặc `dev-images.anyrent.shop`
3. Validate certificate via DNS records trong Cloudflare

---

## 📞 Support

Nếu vẫn gặp vấn đề:
1. Check CloudFront distribution logs
2. Check S3 bucket access logs
3. Verify tất cả checklist items
4. Test với CloudFront domain mặc định trước

---

**Last Updated:** 2025-01-20

