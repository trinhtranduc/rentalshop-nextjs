# 🔍 CloudFront 403 Error Troubleshooting Guide

## ❌ Error: 403 Forbidden khi access `https://images.anyrent.shop/products/...`

### 📋 Checklist Kiểm Tra Từng Bước

---

## ✅ **Bước 1: Kiểm Tra File Có Tồn Tại Trong S3?**

### **1.1. Check S3 Bucket**

Vào **AWS Console** → **S3** → `anyrent-images-pro` → `products/merchant-13/`

**Kiểm tra:**
- ✅ File `image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg` có tồn tại không?
- ✅ File có trong folder `products/merchant-13/` không? (KHÔNG phải trong `staging/`)

**Nếu file KHÔNG tồn tại:**
- ⚠️ Có thể commit từ staging → products chưa thành công
- 🔍 Check logs của API khi tạo/update product
- 🔍 Check `commitStagingFiles()` có chạy thành công không

**Nếu file TỒN TẠI:**
- ➡️ Tiếp tục **Bước 2**

---

## ✅ **Bước 2: Kiểm Tra CloudFront Origin Access Control (OAC)**

### **2.1. Check CloudFront Distribution Settings**

Vào **AWS Console** → **CloudFront** → Chọn distribution cho `images.anyrent.shop`

**Tab "Origins"** → Click vào origin `anyrent-images-pro`:

**Kiểm tra:**
- ✅ **Origin access**: Phải là **"Origin access control settings (recommended)"**
- ✅ **Origin access control**: Phải có một OAC (ví dụ: `anyrent-s3-oac`)
- ❌ **KHÔNG được** là "Public" hoặc "Legacy access identities"

**Nếu OAC chưa config:**
1. Click **Edit**
2. **Origin access**: Chọn **"Origin access control settings (recommended)"**
3. Click **Create control setting**:
   - **Control setting name**: `anyrent-s3-oac`
   - **Origin type**: `S3`
   - **Signing behavior**: `Sign requests`
   - **Signing protocol**: `sigv4`
   - Click **Create**
4. **Save changes**
5. ⏱️ Đợi CloudFront deploy (5-15 phút)

---

## ✅ **Bước 3: Kiểm Tra S3 Bucket Policy**

### **3.1. Check Bucket Policy**

Vào **AWS Console** → **S3** → `anyrent-images-pro` → **Permissions** → **Bucket policy**

**Policy phải có dạng:**

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
      "Resource": "arn:aws:s3:::anyrent-images-pro/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

**Kiểm tra:**
- ✅ `ACCOUNT_ID` phải đúng AWS Account ID của bạn
- ✅ `DISTRIBUTION_ID` phải đúng CloudFront Distribution ID
- ✅ Resource phải là `arn:aws:s3:::anyrent-images-pro/*`

**Cách lấy Distribution ID:**
1. Vào **CloudFront** → Distribution
2. Tab **General**
3. Copy **Distribution ID** (ví dụ: `E1234567890ABC`)

**Cách lấy Account ID:**
- Click vào tên account ở góc trên bên phải AWS Console
- Account ID sẽ hiển thị

**Nếu bucket policy sai:**
1. Click **Edit** bucket policy
2. Copy policy trên và thay `ACCOUNT_ID`, `DISTRIBUTION_ID`
3. **Save changes**

---

## ✅ **Bước 4: Kiểm Tra S3 Block Public Access**

### **4.1. Check Block Public Access Settings**

Vào **AWS Console** → **S3** → `anyrent-images-pro` → **Permissions** → **Block Public Access settings**

**⚠️ QUAN TRỌNG:**
- Với OAC, bạn **KHÔNG cần** unblock public access
- Các settings có thể **đều được check** (block public access)
- CloudFront sẽ access qua OAC, không cần public access

**Nếu đã unblock public access:**
- Không sao, nhưng với OAC thì không cần thiết

---

## ✅ **Bước 5: Kiểm Tra CloudFront Distribution Status**

### **5.1. Check Distribution Deployment Status**

Vào **AWS Console** → **CloudFront** → Distribution

**Kiểm tra:**
- ✅ **Status** phải là **"Deployed"** (không phải "In Progress")
- ✅ **Last modified** time - nếu vừa update config, đợi deploy xong

**Nếu status là "In Progress":**
- ⏱️ Đợi 5-15 phút để CloudFront deploy xong

---

## ✅ **Bước 6: Kiểm Tra DNS & Custom Domain**

### **6.1. Verify DNS Resolution**

Test DNS resolution:

```bash
# Test DNS
dig images.anyrent.shop

# Hoặc
nslookup images.anyrent.shop
```

**Kết quả phải trỏ về CloudFront domain:**
```
images.anyrent.shop. 300 IN CNAME d1234567890.cloudfront.net.
```

**Nếu DNS chưa resolve:**
1. Kiểm tra CNAME record trong DNS provider
2. Đợi DNS propagation (5-30 phút, có thể lên đến 24-48h)

### **6.2. Test với CloudFront Domain Trực Tiếp**

Thử access trực tiếp với CloudFront domain:

```
https://d1234567890.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

**Nếu CloudFront domain HOẠT ĐỘNG:**
- ✅ CloudFront config đúng
- ❌ Vấn đề là DNS/custom domain

**Nếu CloudFront domain CŨNG 403:**
- ❌ Vấn đề là CloudFront/S3 configuration
- ➡️ Review lại Bước 2, 3, 4

---

## ✅ **Bước 7: Kiểm Tra SSL Certificate**

### **7.1. Check SSL Certificate trong CloudFront**

Vào **CloudFront** → Distribution → Tab **General** → **Settings**

**Kiểm tra:**
- ✅ **Custom SSL certificate** phải có certificate cho `*.anyrent.shop` hoặc `images.anyrent.shop`
- ✅ Certificate status phải là **"Issued"** (trong ACM us-east-1)

**Nếu certificate chưa có hoặc chưa issued:**
1. Vào **Certificate Manager** (region **us-east-1**)
2. Tạo certificate cho `*.anyrent.shop` hoặc `images.anyrent.shop`
3. Validate qua DNS
4. Update CloudFront distribution để dùng certificate mới

---

## ✅ **Bước 8: Kiểm Tra CloudFront Cache**

### **8.1. Test với Query Parameter**

Thêm query parameter để bypass cache:

```
https://images.anyrent.shop/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg?v=1
```

**Nếu với query parameter HOẠT ĐỘNG:**
- ⚠️ File cũ có thể bị cache với 403 error
- ➡️ Cần invalidate CloudFront cache

### **8.2. Invalidate CloudFront Cache**

Vào **CloudFront** → Distribution → Tab **Invalidations** → **Create invalidation**

**Object paths:**
```
/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

Hoặc invalidate toàn bộ:
```
/products/*
```

⏱️ Đợi 1-5 phút để invalidation hoàn tất

---

## ✅ **Bước 9: Kiểm Tra Logs**

### **9.1. Check CloudFront Logs**

Nếu đã enable CloudFront access logs:
- Check logs để xem request headers và response codes
- Tìm request ID từ error message để debug

### **9.2. Check API Logs**

Check logs của API khi tạo/update product:
- File có được upload vào S3 không?
- `commitStagingFiles()` có thành công không?
- Production URL có được generate đúng không?

---

## 🔧 Quick Fix Checklist

Nếu vẫn 403, thử các bước sau theo thứ tự:

1. ✅ **Verify file exists** trong S3 bucket (`products/merchant-13/`)
2. ✅ **Check OAC** đã config trong CloudFront origin
3. ✅ **Update bucket policy** với đúng Distribution ID
4. ✅ **Wait for CloudFront deploy** (5-15 phút)
5. ✅ **Invalidate cache** nếu cần
6. ✅ **Test với CloudFront domain** trực tiếp (bypass DNS)

---

## 📊 Common Issues & Solutions

### **Issue 1: File tồn tại nhưng vẫn 403**

**Nguyên nhân**: OAC chưa config hoặc bucket policy sai

**Giải pháp:**
- Config OAC trong CloudFront origin
- Update bucket policy với đúng Distribution ID
- Đợi CloudFront deploy

### **Issue 2: CloudFront domain hoạt động nhưng custom domain 403**

**Nguyên nhân**: SSL certificate hoặc DNS issue

**Giải pháp:**
- Check SSL certificate trong CloudFront
- Verify DNS CNAME record
- Đợi DNS propagation

### **Issue 3: Một số files hoạt động, một số files 403**

**Nguyên nhân**: Files chưa được commit từ staging → products

**Giải pháp:**
- Check logs của API
- Verify `commitStagingFiles()` có chạy thành công
- Manually check files trong S3

### **Issue 4: 403 sau khi update CloudFront config**

**Nguyên nhân**: CloudFront chưa deploy xong

**Giải pháp:**
- Đợi CloudFront deployment (5-15 phút)
- Check distribution status = "Deployed"

---

## 🆘 Still Having Issues?

Nếu sau khi check tất cả các bước trên vẫn còn 403:

1. **Collect information:**
   - CloudFront Request ID từ error message
   - Distribution ID
   - S3 bucket name
   - File path
   - CloudFront access logs (nếu có)

2. **Check AWS Support Center** hoặc CloudFront documentation

3. **Verify với AWS CLI:**
   ```bash
   # Test S3 access
   aws s3 ls s3://anyrent-images-pro/products/merchant-13/
   
   # Test CloudFront distribution
   aws cloudfront get-distribution --id DISTRIBUTION_ID
   ```

