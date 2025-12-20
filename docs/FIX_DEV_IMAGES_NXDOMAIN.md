# 🔧 Fix DNS_PROBE_FINISHED_NXDOMAIN cho dev-images.anyrent.shop

## ❌ Vấn Đề Hiện Tại

**Error:** `DNS_PROBE_FINISHED_NXDOMAIN`  
**URL:** `https://dev-images.anyrent.shop/products/...`

**Nguyên nhân:** DNS record `dev-images` không tồn tại hoặc đã bị xóa trong Cloudflare.

**Kiểm tra DNS:**
```bash
dig dev-images.anyrent.shop
# Result: No answer - Record không tồn tại
```

---

## ✅ Giải Pháp: Tạo Lại CNAME Record trong Cloudflare

### **Bước 1: Lấy CloudFront Distribution Domain**

**✅ Target ĐÚNG cho `dev-images.anyrent.shop`:**
- **CloudFront Distribution:** `AnyRent Images Dev`
- **Distribution Domain:** `d2e6a656cqucti.cloudfront.net` ← **DÙNG CÁI NÀY**
- **Distribution ID:** `E19S291JLEC5EE`

**Cách 1: Từ AWS Console**
1. Vào **AWS Console** → **CloudFront**
2. Tìm distribution **"AnyRent Images Dev"** (development bucket)
3. Copy **Distribution domain name**: `d2e6a656cqucti.cloudfront.net`
   - ⚠️ **QUAN TRỌNG:** Phải là distribution **Dev**, KHÔNG phải **Pro**
   - ⚠️ **KHÔNG dùng:** `dhdvaoq6ff050.cloudfront.net` (đây là production)

**Cách 2: Từ Environment Variables**
- Check trong API server environment: `AWS_CLOUDFRONT_DOMAIN`
- Hoặc check trong codebase: `packages/utils/src/api/aws-s3.ts`

**Cách 3: Từ S3 Bucket**
1. Vào **AWS Console** → **S3** → `anyrent-images-dev`
2. Vào **Properties** → **Static website hosting** (nếu có)
3. Hoặc check CloudFront distributions liên kết với bucket này

---

### **Bước 2: Tạo CNAME Record trong Cloudflare**

1. **Đăng nhập Cloudflare Dashboard**
   - Vào: https://dash.cloudflare.com
   - Chọn domain: `anyrent.shop`

2. **Vào DNS Settings**
   - Click **DNS** → **Records** (sidebar bên trái)

3. **Tạo CNAME Record Mới**
   - Click **Add record** (nút màu xanh ở góc trên bên phải)
   - **Type**: Chọn `CNAME`
   - **Name**: `dev-images` 
     - ⚠️ **QUAN TRỌNG:** Chỉ nhập `dev-images`, KHÔNG nhập `dev-images.anyrent.shop`
   - **Target**: `d2e6a656cqucti.cloudfront.net` (CloudFront distribution domain từ Bước 1)
     - ⚠️ **ĐÚNG:** `d2e6a656cqucti.cloudfront.net` (development distribution)
     - ❌ **SAI:** `dhdvaoq6ff050.cloudfront.net` (production distribution)
     - ⚠️ **KHÔNG có** `https://` hoặc trailing slash
   - **Proxy status**: 
     - ✅ **DNS only** (gray cloud ⚪) - **KHUYẾN NGHỊ**
     - ❌ **KHÔNG chọn** Proxied (orange cloud ☁️) - sẽ gây HTTP 530 errors
   - **TTL**: `Auto` hoặc `3600` (1 hour)
   - Click **Save**

**Screenshot Example:**
```
┌─────────────────────────────────────────┐
│ Add record                               │
├─────────────────────────────────────────┤
│ Type:     [CNAME ▼]                      │
│ Name:     dev-images                     │
│ Target:   d2e6a656cqucti.cloudfront.net  ← ĐÚNG
│ Proxy:    ⚪ DNS only  ← CHỌN NÀY        │
│ TTL:      Auto                           │
│                                          │
│ [Cancel]  [Save]                         │
└─────────────────────────────────────────┘
```

**⚠️ Lưu Ý Quan Trọng:**
- ✅ **Target đúng:** `d2e6a656cqucti.cloudfront.net` (development distribution)
- ❌ **Target sai:** `dhdvaoq6ff050.cloudfront.net` (production distribution - sẽ không hoạt động)

---

### **Bước 3: Verify DNS Propagation**

Sau khi tạo record, đợi **1-5 phút** rồi test:

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
dev-images.anyrent.shop. 300 IN CNAME d2e6a656cqucti.cloudfront.net.
d2e6a656cqucti.cloudfront.net has address XXX.XXX.XXX.XXX
```

**Nếu vẫn chưa resolve:**
- Chờ thêm 5-10 phút (DNS propagation có thể mất đến 30 phút)
- Clear DNS cache:
  ```bash
  # macOS
  sudo dscacheutil -flushcache
  
  # Windows
  ipconfig /flushdns
  
  # Linux
  sudo systemd-resolve --flush-caches
  ```

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

Sau khi DNS propagate và CloudFront deploy xong:

```bash
# Test access
curl -I "https://dev-images.anyrent.shop/products/merchant-17/sea-games-33-u22-viet-nam-vs-u2-thai-lan-1812-1766-1766224173506-p12niq380v.jpg"
```

**Expected Results:**
- ✅ `HTTP/2 200` - File tồn tại và load được
- ✅ `HTTP/2 403` - File không tồn tại (nhưng DNS đã hoạt động)
- ❌ `HTTP/2 530` - Vẫn còn proxy issue (đổi sang DNS only)
- ❌ `DNS_PROBE_FINISHED_NXDOMAIN` - DNS chưa propagate (đợi thêm)

---

## 🚀 Quick Fix Checklist

**Tạo DNS Record:**
- [ ] Lấy CloudFront distribution domain từ AWS Console
- [ ] Vào Cloudflare → DNS → Records
- [ ] Click **Add record**
- [ ] Type: `CNAME`
- [ ] Name: `dev-images` (không có `.anyrent.shop`)
- [ ] Target: `d2e6a656cqucti.cloudfront.net` (Development CloudFront domain)
- [ ] Proxy: ⚪ **DNS only** (gray cloud)
- [ ] TTL: `Auto`
- [ ] Click **Save**

**Verify CloudFront:**
- [ ] CloudFront distribution có alternate domain: `dev-images.anyrent.shop`
- [ ] SSL certificate: `*.anyrent.shop` (status: Issued, region: us-east-1)
- [ ] Distribution status: **Deployed**

**Test:**
- [ ] DNS resolution: `dig dev-images.anyrent.shop` → CloudFront domain
- [ ] Image access: `curl -I https://dev-images.anyrent.shop/...` → HTTP/2 200 hoặc 403
- [ ] Không còn `DNS_PROBE_FINISHED_NXDOMAIN`

---

## 🔍 Troubleshooting

### **Issue 1: DNS vẫn không resolve sau 30 phút**

**Solutions:**
1. Verify CNAME record trong Cloudflare:
   - Name: `dev-images` (không có `.anyrent.shop`)
   - Target: `d2e6a656cqucti.cloudfront.net` (development distribution)
   - ⚠️ **KHÔNG dùng:** `dhdvaoq6ff050.cloudfront.net` (production distribution)
   - Proxy: DNS only (gray cloud)

2. Clear DNS cache:
   ```bash
   sudo dscacheutil -flushcache  # macOS
   ipconfig /flushdns            # Windows
   ```

3. Test với DNS server khác:
   ```bash
   dig @8.8.8.8 dev-images.anyrent.shop
   ```

### **Issue 2: HTTP 530 sau khi tạo DNS record**

**Nguyên nhân:** Record đang ở chế độ Proxied (orange cloud)

**Solution:**
1. Edit record trong Cloudflare
2. Đổi Proxy status: ☁️ Proxied → ⚪ DNS only
3. Save và đợi DNS propagate

### **Issue 3: HTTP 403 sau khi DNS hoạt động**

**Nguyên nhân:** File không tồn tại hoặc CloudFront chưa có alternate domain

**Solutions:**
1. Check file có tồn tại trong S3: `products/merchant-17/...`
2. Check CloudFront alternate domain names có `dev-images.anyrent.shop`
3. Check SSL certificate đã được config

---

## 📋 Tóm Tắt

**Vấn đề:** DNS record `dev-images` không tồn tại → `DNS_PROBE_FINISHED_NXDOMAIN`

**Giải pháp:** Tạo lại CNAME record trong Cloudflare:
- Type: `CNAME`
- Name: `dev-images`
- Target: CloudFront distribution domain
- Proxy: ⚪ **DNS only** (gray cloud)

**Thời gian:** 5-30 phút (DNS propagation)

**Kết quả:** `dev-images.anyrent.shop` sẽ resolve về CloudFront và images sẽ load được

---

**Last Updated:** 2025-12-20  
**Status:** ⚠️ DNS record cần được tạo lại trong Cloudflare

