# 🔧 S3 Bucket Policy Fix for CloudFront 403

## ⚠️ Vấn Đề Hiện Tại

Bucket policy của bạn có 2 statements, trong đó Statement 2 đang dùng `ArnLike` thay vì `StringEquals`.

**Policy hiện tại:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::anyrent-images-pro/*"
    },
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::anyrent-images-pro/*",
      "Condition": {
        "ArnLike": {  // ⚠️ Nên dùng StringEquals
          "AWS:SourceArn": "arn:aws:cloudfront::124328426706:distribution/E29YVDA77K7TLP"
        }
      }
    }
  ]
}
```

## ✅ Giải Pháp

### **Option 1: Sửa Policy (Recommended)**

Thay `ArnLike` bằng `StringEquals` cho chính xác hơn:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::anyrent-images-pro/*"
    },
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::anyrent-images-pro/*",
      "Condition": {
        "StringEquals": {  // ✅ Đổi từ ArnLike sang StringEquals
          "AWS:SourceArn": "arn:aws:cloudfront::124328426706:distribution/E29YVDA77K7TLP"
        }
      }
    }
  ]
}
```

### **Option 2: Chỉ Dùng CloudFront (Secure - Recommended nếu đã có OAC)**

Nếu đã config OAC đúng, có thể remove public access statement:

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

⚠️ **Lưu ý**: Chỉ remove public access statement nếu:
- ✅ CloudFront OAC đã được config đúng
- ✅ Không cần direct S3 access (chỉ access qua CloudFront)

## 🔍 Kiểm Tra CloudFront OAC

Trước khi update policy, đảm bảo OAC đã config:

1. Vào **CloudFront** → Distribution `E29YVDA77K7TLP`
2. Tab **Origins** → Click origin `anyrent-images-pro`
3. Kiểm tra:
   - ✅ **Origin access**: `Origin access control settings (recommended)`
   - ✅ **Origin access control**: Có OAC name (ví dụ: `anyrent-s3-oac`)

## 📝 Cách Update Bucket Policy

1. Vào **AWS Console** → **S3**
2. Click bucket `anyrent-images-pro`
3. Tab **Permissions**
4. Scroll xuống **Bucket policy**
5. Click **Edit**
6. Paste policy mới (Option 1 hoặc Option 2)
7. Click **Save changes**

## 🧪 Test Sau Khi Update

Sau khi update policy, test lại:

```bash
# Test với CloudFront domain
curl -I https://images.anyrent.shop/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg

# Hoặc test với CloudFront domain trực tiếp
curl -I https://d[YOUR-DISTRIBUTION-ID].cloudfront.net/products/merchant-13/image_0-1765436157635-1up2jo9mhhr-1765436157636-dxzpv5gjchk.jpg
```

Kết quả mong đợi: `HTTP/2 200` (không phải 403)

## ❓ ArnLike vs StringEquals

- **ArnLike**: Cho phép pattern matching (ví dụ: `arn:aws:cloudfront::*:distribution/*`)
- **StringEquals**: Yêu cầu exact match (chính xác hơn, secure hơn)

Với CloudFront distribution ID cụ thể, nên dùng `StringEquals` cho chính xác hơn.

