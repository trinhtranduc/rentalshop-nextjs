# 🌐 CloudFront Custom Domain Fix - DNS Configuration

## ✅ Xác Nhận

**CloudFront URL trực tiếp hoạt động:**
```
https://dhdvaoq6ff050.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```
✅ CloudFront distribution và S3 bucket config đều đúng.

**Custom domain không hoạt động (403):**
```
https://images.anyrent.shop/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```
❌ Vấn đề là DNS/custom domain configuration.

---

## 🔍 Nguyên Nhân: DNS hoặc CloudFront CNAME Configuration

Có 2 khả năng:
1. **DNS CNAME record chưa được config** hoặc chưa propagate
2. **CloudFront distribution chưa có alternate domain name (CNAME)** được thêm vào

---

## ✅ Giải Pháp: Kiểm Tra & Fix Custom Domain

### **Bước 1: Kiểm Tra CloudFront Alternate Domain Names (CNAMEs)**

1. Vào **AWS Console** → **CloudFront**
2. Click vào distribution `E29YVDA77K7TLP` (hoặc domain `dhdvaoq6ff050.cloudfront.net`)
3. Tab **General** → Click **Edit**
4. Scroll xuống **Alternate domain names (CNAMEs)**

**Kiểm tra:**
- ✅ Phải có `images.anyrent.shop` trong list
- ❌ Nếu không có → Cần thêm vào

**Nếu chưa có:**
1. Click **Add item** trong Alternate domain names section
2. Nhập: `images.anyrent.shop`
3. **Custom SSL certificate**: Chọn certificate cho `*.anyrent.shop` hoặc `images.anyrent.shop` (phải ở us-east-1 region)
4. Click **Save changes**
5. ⏱️ Đợi CloudFront deploy (5-15 phút)

---

### **Bước 2: Kiểm Tra SSL Certificate**

CloudFront cần SSL certificate cho custom domain:

1. Vào **AWS Console** → **Certificate Manager** (⚠️ Region phải là **us-east-1**)
2. Kiểm tra certificate cho `*.anyrent.shop` hoặc `images.anyrent.shop`
3. Status phải là **"Issued"**

**Nếu chưa có certificate:**
1. Click **Request certificate**
2. **Certificate type**: `Request a public certificate`
3. **Domain names**:
   - `images.anyrent.shop` (specific)
   - HOẶC `*.anyrent.shop` (wildcard - recommended cho nhiều subdomains)
4. **Validation method**: `DNS validation` (recommended)
5. Click **Request**
6. Thêm CNAME records vào DNS provider để validate
7. Đợi validation (5-30 phút) → Status = "Issued"

---

### **Bước 3: Kiểm Tra DNS CNAME Record**

Kiểm tra DNS record đã được config đúng chưa:

#### **3.1. Test DNS Resolution**

```bash
# Test DNS
dig images.anyrent.shop

# Hoặc
nslookup images.anyrent.shop

# Hoặc
host images.anyrent.shop
```

**Kết quả mong đợi:**
```
images.anyrent.shop. 300 IN CNAME dhdvaoq6ff050.cloudfront.net.
```

**Nếu không resolve hoặc resolve sai:**
- ➡️ Cần config DNS CNAME record

#### **3.2. Config DNS CNAME Record**

**Nếu dùng Route 53:**

1. Vào **AWS Console** → **Route 53**
2. **Hosted zones** → Chọn `anyrent.shop`
3. Click **Create record**
4. **Record name**: `images`
5. **Record type**: `CNAME - Routes traffic to another domain name`
6. **Value**: `dhdvaoq6ff050.cloudfront.net` (CloudFront domain - KHÔNG có `https://`)
7. **TTL**: `300` (5 minutes) hoặc `3600` (1 hour)
8. Click **Create records**

**Nếu dùng DNS Provider khác (Cloudflare, Namecheap, etc.):**

1. Vào DNS management của provider
2. Tạo record mới:
   - **Type**: `CNAME`
   - **Name**: `images` (hoặc `images.anyrent.shop` tùy provider)
   - **Value/Content/Target**: `dhdvaoq6ff050.cloudfront.net`
   - **TTL**: `300` hoặc `3600`
3. Save changes

---

### **Bước 4: Đợi DNS Propagation**

Sau khi config DNS CNAME:

1. ⏱️ **DNS propagation time**: 5-30 phút (có thể lên đến 24-48h)
2. Test lại với `dig` hoặc `nslookup` để verify
3. Test với browser sau khi DNS propagate

---

### **Bước 5: Test Sau Khi Config**

Sau khi DNS propagate và CloudFront deploy xong:

```bash
# Test DNS resolution
dig images.anyrent.shop

# Test HTTP access
curl -I https://images.anyrent.shop/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg

# Hoặc test trong browser
https://images.anyrent.shop/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

**Kết quả mong đợi:**
- DNS resolve về CloudFront domain
- HTTP response: `HTTP/2 200` (không phải 403)
- Image hiển thị trong browser

---

## 🔍 Troubleshooting

### **Issue 1: DNS không resolve**

**Kiểm tra:**
- CNAME record đã được tạo chưa?
- Tên record đúng không? (`images`, không phải `images.anyrent.shop` trong một số provider)
- Value có đúng CloudFront domain không? (`dhdvaoq6ff050.cloudfront.net`)

**Giải pháp:**
- Verify DNS record trong DNS provider
- Đợi DNS propagation (có thể mất 24-48h)
- Test với multiple DNS servers (Google: 8.8.8.8, Cloudflare: 1.1.1.1)

### **Issue 2: DNS resolve nhưng vẫn 403**

**Nguyên nhân**: CloudFront chưa có alternate domain name hoặc SSL certificate chưa được attach.

**Giải pháp:**
- Kiểm tra CloudFront alternate domain names (Bước 1)
- Kiểm tra SSL certificate đã được attach chưa
- Đợi CloudFront deploy xong

### **Issue 3: SSL Certificate Error**

**Nguyên nhân**: Certificate chưa được issue hoặc region sai.

**Giải pháp:**
- Certificate phải ở **us-east-1** region (bắt buộc cho CloudFront)
- Certificate status phải là "Issued"
- Verify certificate đã cover domain (`*.anyrent.shop` hoặc `images.anyrent.shop`)

### **Issue 4: Cached 403 Error**

**Giải pháp**: Clear browser cache hoặc test với incognito mode.

---

## 📋 Quick Checklist

- [ ] CloudFront alternate domain names có `images.anyrent.shop`
- [ ] SSL certificate cho `*.anyrent.shop` hoặc `images.anyrent.shop` đã được issue (us-east-1)
- [ ] SSL certificate đã được attach vào CloudFront distribution
- [ ] DNS CNAME record: `images` → `dhdvaoq6ff050.cloudfront.net`
- [ ] DNS đã propagate (test với `dig` hoặc `nslookup`)
- [ ] CloudFront distribution status = "Deployed"
- [ ] Test với `https://images.anyrent.shop/...` (không phải `http://`)

---

## 🎯 Expected Result

Sau khi fix, cả 3 URLs đều phải hoạt động:

✅ CloudFront domain:
```
https://dhdvaoq6ff050.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

✅ Custom domain (sau khi DNS propagate):
```
https://images.anyrent.shop/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

✅ Direct S3 (nếu public access enabled):
```
https://anyrent-images-pro.s3.ap-southeast-1.amazonaws.com/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

