# 📁 S3 Simplified Folder Structure

## 🎯 New Simplified Structure

### **Two Separate Buckets Approach**

Thay vì dùng `env/` prefix, chúng ta dùng **2 buckets riêng biệt**:

```
anyrent-images-dev/        ← Development bucket
├── staging/              ← Staging folder (tạm thời)
└── products/             ← Production folder (lâu dài)
    └── merchant-{id}/
        └── image.jpg     ← Products belong to merchant level

anyrent-images-pro/        ← Production bucket  
├── staging/              ← Staging folder (tạm thời)
└── products/             ← Production folder (lâu dài)
    └── merchant-{id}/
        └── image.jpg     ← Products belong to merchant level
```

## ✅ Benefits

1. **Đơn giản hơn**: Không cần `env/dev/` hay `env/prod/` prefix
2. **Dễ quản lý**: Mỗi environment có bucket riêng
3. **Bảo mật tốt hơn**: Có thể set IAM policy riêng cho mỗi bucket
4. **CloudFront dễ config**: 1 distribution cho mỗi bucket

## 🛠️ Tạo S3 Buckets

### **Bước 1: Tạo Development Bucket**

1. Vào **AWS Console** → **S3** → **Create bucket**
2. **Bucket name**: `anyrent-images-dev` ⚠️ Phải chính xác tên này
3. **AWS Region**: `ap-southeast-1` (Singapore - recommended) hoặc region bạn muốn
4. **Object Ownership**: 
   - ✅ **ACLs disabled (recommended)** - Dùng bucket owner enforced
5. **Block Public Access settings**:
   - ✅ **Uncheck** "Block all public access" (cần cho CloudFront public access)
   - ⚠️ Để lại các settings khác như mặc định (block ACLs)
6. **Bucket Versioning**: `Disable` (hoặc Enable nếu cần backup)
7. **Default encryption**: 
   - ✅ **Enable**
   - **Encryption type**: `SSE-S3` (AWS managed keys)
8. Click **Create bucket**

### **Bước 2: Tạo Production Bucket**

Lặp lại **Bước 1** với:
- **Bucket name**: `anyrent-images-pro` ⚠️ Phải chính xác tên này
- Các settings khác giống nhau

### **Bước 3: Cấu Hình Bucket Policy (Public Read cho CloudFront)**

Vào mỗi bucket → **Permissions** → **Bucket policy** → **Edit**:

**For `anyrent-images-pro` (Production)**:
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
    }
  ]
}
```

**For `anyrent-images-dev` (Development)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::anyrent-images-dev/*"
    }
  ]
}
```

⚠️ **Lưu ý**: Sau khi tạo CloudFront distribution, cần update bucket policy để chỉ allow CloudFront access (xem hướng dẫn CloudFront setup).

### **Bước 4: Verify Buckets**

Kiểm tra buckets đã tạo:
- ✅ `anyrent-images-dev`
- ✅ `anyrent-images-pro`

---

## 🔧 Configuration

### **Auto Bucket Selection**

Code tự động chọn bucket dựa trên `NODE_ENV`:

```typescript
// Development: NODE_ENV=development → anyrent-images-dev
// Production: NODE_ENV=production → anyrent-images-pro
```

### **Manual Override**

Có thể set explicitly qua environment variable:

```bash
# Development
AWS_S3_BUCKET_NAME=anyrent-images-dev

# Production
AWS_S3_BUCKET_NAME=anyrent-images-pro
```

⚠️ **Nếu bucket chưa tồn tại**: Code sẽ lỗi khi upload. Đảm bảo buckets đã được tạo trước khi deploy.

## 📂 Folder Paths

### **Staging**
```
staging/image_0-1234567890-abc123.jpg
```

### **Products**  
```
products/merchant-1/product-image-1234567890-abc123.jpg
```

## 🔄 Migration từ Old Structure

Code hỗ trợ **backward compatibility** - vẫn có thể đọc files từ old structure (`env/prod/staging/...`), nhưng **files mới sẽ dùng new structure**.

## 🚀 CloudFront Setup

Xem hướng dẫn chi tiết đầy đủ: **[AWS_S3_CLOUDFRONT_SETUP.md](./AWS_S3_CLOUDFRONT_SETUP.md)**

### **Quick Summary**

Sau khi đã tạo S3 buckets:

1. **Tạo SSL Certificate** ở `us-east-1` region (⚠️ Bắt buộc phải là us-east-1)
   - Domain: `*.anyrent.shop` (wildcard)
   - Validate qua DNS

2. **Tạo CloudFront Distribution** cho production bucket
   - Origin: `anyrent-images-pro.s3.ap-southeast-1.amazonaws.com`
   - Alternate Domain: `images.anyrent.shop`
   - SSL Certificate: Chọn certificate đã tạo

3. **Tạo DNS CNAME record**
   - Type: CNAME
   - Name: `images`
   - Value: `d1234567890.cloudfront.net` (CloudFront domain)

4. **Update Bucket Policy** để chỉ allow CloudFront access
   - Thêm CloudFront Service Principal vào bucket policy

5. **Set Environment Variable**
   ```bash
   AWS_CLOUDFRONT_DOMAIN=images.anyrent.shop
   ```

## 📝 Environment Variables

```bash
# AWS S3 - Auto bucket selection based on NODE_ENV
NODE_ENV=production                    # → anyrent-images-pro
# OR set explicitly:
AWS_S3_BUCKET_NAME=anyrent-images-pro

# CloudFront Custom Domain
AWS_CLOUDFRONT_DOMAIN=images.anyrent.shop

# AWS Credentials
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

## 🔍 Example URLs

### **Before (Old Structure)**
```
https://images.anyrent.shop/env/prod/products/merchant-1/outlet-2/image.jpg
```

### **After (New Structure)** ✅
```
https://images.anyrent.shop/products/merchant-1/image.jpg
```

**Shorter, cleaner URLs! Products belong to merchant level only.** 🎉

## 🔐 Security Best Practices

1. **Bucket Policies**: Set separate policies cho dev và prod buckets
2. **IAM Roles**: Restrict access based on environment
3. **CloudFront Signed URLs**: Optional for private content
4. **CORS**: Configure properly for web/mobile access

## 📊 Folder Sizes

Monitor folder sizes để cleanup staging files:

```bash
# Check staging folder size
aws s3 ls s3://anyrent-images-pro/staging/ --recursive --human-readable --summarize
```

