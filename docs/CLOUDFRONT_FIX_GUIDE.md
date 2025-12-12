# 🔧 CloudFront 403 Fix - File Tồn Tại Nhưng CloudFront Không Access Được

## ✅ Xác Nhận Vấn Đề

**Direct S3 URL hoạt động:**
```
https://anyrent-images-pro.s3.ap-southeast-1.amazonaws.com/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```
✅ File tồn tại trong S3 và public read đang hoạt động.

**CloudFront URL không hoạt động:**
```
https://dhdvaoq6ff050.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```
❌ CloudFront không thể access file từ S3.

**⚠️ Lưu ý**: Nếu URL có `.cloudfront.net.cloudfront.net` (duplicate), đó là typo. URL đúng phải là `.cloudfront.net`.

---

## 🔍 Nguyên Nhân

Vấn đề chính là: **CloudFront OAC chưa được config đúng** hoặc **CloudFront distribution chưa được update sau khi config OAC**.

---

## ✅ Giải Pháp: Kiểm Tra & Fix CloudFront OAC

### **Bước 1: Verify CloudFront Distribution ID**

Distribution ID từ bucket policy của bạn: `E29YVDA77K7TLP`

Test URL đúng format (không có duplicate `.cloudfront.net`):
```
https://dhdvaoq6ff050.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

### **Bước 2: Kiểm Tra CloudFront Origin Access Control (OAC)**

1. Vào **AWS Console** → **CloudFront**
2. Tìm distribution với ID `E29YVDA77K7TLP` (hoặc domain `dhdvaoq6ff050.cloudfront.net`)
3. Click vào distribution
4. Tab **Origins** → Click vào origin `anyrent-images-pro`

**Kiểm tra các điểm sau:**

#### ✅ **Origin Domain**
```
anyrent-images-pro.s3.ap-southeast-1.amazonaws.com
```
Phải match với bucket name.

#### ✅ **Origin Access**
Phải là: **"Origin access control settings (recommended)"**

**❌ NẾU ĐANG LÀ:**
- "Public" → Cần config OAC
- "Legacy access identities" → Cần update sang OAC

#### ✅ **Origin Access Control**
Phải có một OAC name (ví dụ: `anyrent-s3-oac`)

---

### **Bước 3: Config OAC (Nếu Chưa Có)**

1. Trong **Origin Settings**, click **Edit**
2. **Origin access**: Chọn **"Origin access control settings (recommended)"**
3. Click **Create control setting**:
   - **Control setting name**: `anyrent-s3-oac`
   - **Origin type**: `S3`
   - **Signing behavior**: `Sign requests` ✅
   - **Signing protocol**: `sigv4` ✅
   - Click **Create**
4. Select OAC vừa tạo từ dropdown
5. Click **Save changes**

**⏱️ Quan trọng**: Đợi CloudFront deploy (5-15 phút). Status phải = "Deployed".

---

### **Bước 4: Verify Bucket Policy Sau Khi Config OAC**

Sau khi config OAC, **AWS sẽ tự động suggest bucket policy mới**.

1. Sau khi save CloudFront origin settings, AWS sẽ hiển thị notification:
   ```
   "Copy policy to bucket permission"
   ```
2. Click notification để copy suggested bucket policy
3. Vào **S3** → `anyrent-images-pro` → **Permissions** → **Bucket policy**
4. **Update bucket policy** với policy mới (hoặc merge với policy hiện tại)

**Policy mới sẽ có dạng:**
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
          "AWS:SourceArn": "arn:aws:cloudfront::124328426706:distribution/E29YVDA77K7TLP"
        }
      }
    }
  ]
}
```

**⚠️ Lưu ý**: Có thể giữ cả public read statement nếu muốn, nhưng với OAC thì không cần thiết.

---

### **Bước 5: Đợi CloudFront Deploy**

Sau khi update origin settings:

1. Check **Distribution Status** = "Deployed" (không phải "In Progress")
2. ⏱️ Thường mất **5-15 phút** để deploy xong
3. Check **Last modified** time để biết khi nào config mới được apply

---

### **Bước 6: Test Sau Khi Deploy**

Sau khi status = "Deployed", test lại:

```bash
# Test với curl
curl -I https://dhdvaoq6ff050.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg

# Hoặc test trong browser
https://dhdvaoq6ff050.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

**Kết quả mong đợi:**
- `HTTP/2 200` (không phải 403)
- Image hiển thị trong browser

---

## 🔍 Troubleshooting Nếu Vẫn 403

### **Issue 1: OAC đã config nhưng vẫn 403**

**Nguyên nhân**: Bucket policy chưa được update với OAC ARN.

**Giải pháp**:
1. Trong CloudFront → Origin settings, click vào OAC name
2. Copy **ARN** của OAC (ví dụ: `arn:aws:cloudfront::124328426706:origin-access-control/e1234567890abc`)
3. Update bucket policy để include OAC ARN trong condition (nếu cần)

**Tuy nhiên**, thường chỉ cần Distribution ARN là đủ:
```json
"Condition": {
  "StringEquals": {
    "AWS:SourceArn": "arn:aws:cloudfront::124328426706:distribution/E29YVDA77K7TLP"
  }
}
```

### **Issue 2: Distribution ID không match**

**Kiểm tra**:
- Distribution ID trong bucket policy: `E29YVDA77K7TLP`
- Distribution ID thực tế trong CloudFront console

**Nếu không match**: Update bucket policy với Distribution ID đúng.

### **Issue 3: CloudFront chưa deploy xong**

**Kiểm tra**:
- Status = "Deployed" (không phải "In Progress")
- Last modified time < 15 phút trước

**Nếu chưa deploy**: Đợi thêm 5-10 phút.

### **Issue 4: Cache vẫn giữ 403 error**

**Giải pháp**: Invalidate CloudFront cache:

1. CloudFront → Distribution → Tab **Invalidations**
2. Click **Create invalidation**
3. **Object paths**: `/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg`
4. Click **Create invalidation**
5. ⏱️ Đợi 1-5 phút

---

## 📋 Quick Checklist

- [ ] CloudFront origin access = "Origin access control settings (recommended)"
- [ ] OAC đã được tạo và selected
- [ ] Bucket policy có CloudFront service principal
- [ ] Distribution ID trong bucket policy match với CloudFront distribution
- [ ] CloudFront status = "Deployed"
- [ ] Test với CloudFront URL (không phải direct S3 URL)
- [ ] Invalidate cache nếu cần

---

## 🎯 Expected Result

Sau khi fix, cả 2 URLs đều phải hoạt động:

✅ Direct S3:
```
https://anyrent-images-pro.s3.ap-southeast-1.amazonaws.com/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

✅ CloudFront:
```
https://dhdvaoq6ff050.cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

✅ Custom Domain (sau khi DNS propagate):
```
https://images.anyrent.shop/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

