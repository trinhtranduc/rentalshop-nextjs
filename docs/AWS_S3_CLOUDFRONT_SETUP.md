# 🚀 AWS S3 + CloudFront Setup Guide

Hướng dẫn chi tiết cách setup S3 buckets và CloudFront. 

**⚡ Quick Start**: Bạn có thể dùng CloudFront ngay với CloudFront domain mặc định (`d1234567890.cloudfront.net`) mà **KHÔNG cần verify DNS**. Thêm custom domain (`images.anyrent.shop`) sau khi đã verify DNS.

## 📋 Tổng Quan

### **Cấu Trúc Buckets**

```
anyrent-images-dev/        ← Development bucket
├── staging/              ← Staging folder (tạm thời)
└── products/             ← Production folder
    └── merchant-{id}/
        └── image.jpg

anyrent-images-pro/        ← Production bucket  
├── staging/              ← Staging folder (tạm thời)
└── products/             ← Production folder
    └── merchant-{id}/
        └── image.jpg
```

### **CloudFront Distribution**

- **Custom Domain**: `images.anyrent.shop`
- **Origin**: `anyrent-images-pro.s3.ap-southeast-1.amazonaws.com`
- **SSL Certificate**: `*.anyrent.shop` (wildcard)

---

## 🔧 Bước 1: Tạo S3 Buckets

### **1.1. Tạo Development Bucket**

1. Vào **AWS Console** → **S3**
2. Click **Create bucket**
3. **General configuration**:
   - **Bucket name**: `anyrent-images-dev` ⚠️ **Phải chính xác tên này**
   - **AWS Region**: `ap-southeast-1` (Singapore - recommended)
4. **Object Ownership**:
   - ✅ **ACLs disabled (recommended)** 
   - Select: **Bucket owner enforced**
5. **Block Public Access settings for this bucket**:
   - ⚠️ **QUAN TRỌNG**: Uncheck tất cả 4 options để allow public access cho CloudFront:
     - ❌ Block public access to buckets and objects granted through new access control lists (ACLs)
     - ❌ Block public access to buckets and objects granted through any access control lists (ACLs)  
     - ❌ Block public access to buckets and objects granted through new public bucket or access point policies
     - ❌ Block public and cross-account access to buckets and objects through any public bucket or access point policies
   - Confirm bằng cách check box "I acknowledge that the current settings might result in this bucket and the objects within it becoming public"
6. **Bucket Versioning**: 
   - `Disable` (recommended cho cost savings)
   - Hoặc `Enable` nếu cần backup/version control
7. **Tags** (optional): Thêm tags để tracking cost
   - Key: `Environment`, Value: `dev`
   - Key: `Project`, Value: `anyrent`
8. **Default encryption**:
   - ✅ **Enable**
   - **Encryption type**: `SSE-S3` (AWS managed keys) - Free
   - Hoặc `SSE-KMS` nếu cần more control (có phí)
9. Click **Create bucket**

✅ **Verify**: Bucket `anyrent-images-dev` xuất hiện trong bucket list

### **1.2. Tạo Production Bucket**

Lặp lại **1.1** với các thay đổi sau:
- **Bucket name**: `anyrent-images-pro` ⚠️ **Phải chính xác tên này**
- **Tags** (optional):
  - Key: `Environment`, Value: `prod`
  - Key: `Project`, Value: `anyrent`

✅ **Verify**: Có 2 buckets: `anyrent-images-dev` và `anyrent-images-pro`

### **1.3. Cấu Hình Bucket Policy (Temporary - Public Read)**

⚠️ **Temporary setup**: Sau khi tạo CloudFront distribution, sẽ update để chỉ allow CloudFront access (Bước 5).

**For Production Bucket (`anyrent-images-pro`)**:

1. Vào bucket `anyrent-images-pro` → **Permissions** tab
2. Scroll xuống **Bucket policy** → Click **Edit**
3. Paste policy sau:

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

4. Click **Save changes**

**For Development Bucket (`anyrent-images-dev`)**:

Lặp lại với bucket name khác:

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

✅ **Verify**: Upload test file và access qua URL để verify public access hoạt động.

---

## 🔒 Bước 2: Tạo CloudFront Distribution (Có thể làm trước khi verify DNS)

### **⚠️ Lưu ý quan trọng:**

Bạn có **2 lựa chọn**:

1. **Dùng CloudFront domain trước** (Khuyến nghị cho testing) ✅
   - Tạo distribution với CloudFront domain mặc định: `d1234567890.cloudfront.net`
   - **KHÔNG cần verify DNS** - có thể test ngay
   - Thêm custom domain sau khi verify DNS (Bước 3)

2. **Dùng custom domain ngay** (Cần verify DNS trước)
   - Cần tạo SSL certificate và verify DNS trước (Bước 2.1)
   - Sau đó mới tạo distribution với custom domain

### **Hướng dẫn: Dùng CloudFront domain trước (Recommended)**

### **2.1. Tạo CloudFront Distribution**

1. Vào **AWS Console** → **CloudFront**
2. Click **Create distribution**

### **2.2. Origin Settings**

**Origin domain**: 
```
anyrent-images-pro.s3.ap-southeast-1.amazonaws.com
```

**⚠️ Lưu ý**: 
- Chọn bucket từ dropdown (không gõ tay)
- Hoặc dùng format: `anyrent-images-pro.s3.ap-southeast-1.amazonaws.com`

**Origin path**: (để trống)

**Name**: `anyrent-images-pro` (tự động generate)

**Origin access**: 
- ✅ **Origin access control settings (recommended)**
- Click **Create control setting**:
  - **Control setting name**: `anyrent-s3-oac`
  - **Origin type**: `S3`
  - **Signing behavior**: `Sign requests`
  - **Signing protocol**: `sigv4`
  - Click **Create**

**Origin shield**: (optional, để trống)

### **2.3. Default Cache Behavior**

**Viewer protocol policy**: `Redirect HTTP to HTTPS` ✅

**Allowed HTTP methods**: 
- ✅ `GET, HEAD`
- ✅ `OPTIONS` (for CORS)

**Cache policy**: `CachingOptimized` (recommended)

**Origin request policy**: (optional, để trống)

**Response headers policy**: (optional, để trống)

### **2.4. Distribution Settings**

**Price class**: `Use all edge locations (best performance)` (hoặc chọn cheaper option)

**Alternate domain names (CNAMEs)**: 
- ⚠️ **ĐỂ TRỐNG** - Sẽ thêm sau khi verify DNS

**Custom SSL certificate**: 
- ⚠️ **ĐỂ TRỐNG** - Sẽ thêm sau khi có certificate

**Default root object**: (để trống)

**Comment**: `AnyRent Production Images CDN`

**Enable IPv6**: ✅ (recommended)

**HTTP/3**: ✅ (optional, recommended)

### **2.5. Create Distribution**

Click **Create distribution**

**⏱️ Deployment time**: 5-15 phút

**Sau khi deploy xong**, bạn sẽ có CloudFront domain:
```
https://d1234567890.cloudfront.net
```

**✅ Bây giờ bạn đã có thể:**
- Upload images và test với CloudFront domain
- Set environment variable: `AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net`
- Test tất cả functionality

**➡️ Bước tiếp theo**: Verify DNS và add custom domain (Bước 3)

---

## 🔒 Bước 3: Tạo SSL Certificate (Chỉ khi muốn dùng custom domain)

### **2.1. Request Certificate**

1. Vào **AWS Console** → **Certificate Manager**
2. **Region**: **US East (N. Virginia)** ⚠️ **QUAN TRỌNG**: CloudFront chỉ chấp nhận certificates từ `us-east-1`
3. Click **Request certificate**
4. **Certificate type**: `Request a public certificate`
5. **Domain names**:
   - `images.anyrent.shop` (specific domain)
   - `*.anyrent.shop` (wildcard - optional, để dùng cho nhiều subdomains)
6. **Validation method**: `DNS validation` (recommended)
7. Click **Request**

### **2.2. Validate Certificate**

1. Sau khi request, AWS sẽ tạo **CNAME records** cần thêm vào DNS
2. Vào **Route 53** (hoặc DNS provider của bạn)
3. Thêm CNAME records như AWS yêu cầu:
   ```
   Type: CNAME
   Name: _abc123def456.images.anyrent.shop
   Value: _xyz789.abc.acm-validations.aws.
   ```
4. Đợi validation (thường 5-30 phút)
5. Status sẽ chuyển từ **Pending validation** → **Issued** ✅

---

## ☁️ Bước 3: Tạo CloudFront Distribution

### **3.1. Create Distribution**

1. Vào **AWS Console** → **CloudFront**
2. Click **Create distribution**

### **3.2. Origin Settings**

**Origin domain**: 
```
anyrent-images-pro.s3.ap-southeast-1.amazonaws.com
```

**⚠️ Lưu ý**: 
- Chọn bucket từ dropdown (không gõ tay)
- Hoặc dùng format: `anyrent-images-pro.s3.ap-southeast-1.amazonaws.com`

**Origin path**: (để trống)

**Name**: `anyrent-images-pro` (tự động generate)

**Origin access**: 
- ✅ **Origin access control settings (recommended)**
- Click **Create control setting**:
  - **Control setting name**: `anyrent-s3-oac`
  - **Origin type**: `S3`
  - **Signing behavior**: `Sign requests`
  - **Signing protocol**: `sigv4`
  - Click **Create**

**Origin shield**: (optional, để trống)

### **3.3. Default Cache Behavior**

**Viewer protocol policy**: `Redirect HTTP to HTTPS` ✅

**Allowed HTTP methods**: 
- ✅ `GET, HEAD`
- ✅ `OPTIONS` (for CORS)

**Cache policy**: `CachingOptimized` (recommended)

**Origin request policy**: (optional, để trống)

**Response headers policy**: (optional, để trống)

### **3.4. Distribution Settings**

**Price class**: `Use all edge locations (best performance)` (hoặc chọn cheaper option)

**Alternate domain names (CNAMEs)**:
```
images.anyrent.shop
```

**Custom SSL certificate**: 
- Chọn certificate đã tạo ở bước 2 (`*.anyrent.shop`)

**Default root object**: (để trống)

**Comment**: `AnyRent Production Images CDN`

**Enable IPv6**: ✅ (recommended)

**HTTP/3**: ✅ (optional, recommended)

### **3.5. Create Distribution**

Click **Create distribution**

**⏱️ Deployment time**: 5-15 phút

---

## 🔗 Bước 4: Cấu Hình DNS (Route 53 hoặc DNS Provider)

### **4.1. Lấy CloudFront Domain**

Sau khi distribution deploy xong, lấy **Distribution domain name**:
```
d1234567890.cloudfront.net
```

### **4.2. Tạo CNAME Record**

**Route 53**:
1. Vào **Hosted zones** → chọn `anyrent.shop`
2. Click **Create record**
3. **Record name**: `images`
4. **Record type**: `CNAME - Routes traffic to another domain name`
5. **Value**: `d1234567890.cloudfront.net` (CloudFront domain)
6. **TTL**: `300` (5 minutes)
7. Click **Create records**

**DNS Provider khác** (Cloudflare, Namecheap, etc.):
```
Type: CNAME
Name: images
Value: d1234567890.cloudfront.net
TTL: 300 (or Auto)
```

### **4.3. Verify DNS**

Chờ DNS propagate (5-30 phút), sau đó test:

```bash
# Test DNS resolution
dig images.anyrent.shop
# Hoặc
nslookup images.anyrent.shop
```

Kết quả phải trỏ về CloudFront domain.

---

## 🔐 Bước 5: Cấu Hình S3 Bucket Policy cho CloudFront

### **5.1. Update Bucket Policy**

Vào bucket `anyrent-images-pro` → **Permissions** → **Bucket policy**:

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

**Thay thế**:
- `ACCOUNT_ID`: AWS Account ID của bạn
- `DISTRIBUTION_ID`: CloudFront Distribution ID (ví dụ: `E1234567890ABC`)

**Cách lấy Distribution ID**:
- Vào CloudFront → Distribution → Copy ID từ URL hoặc Overview tab

### **5.2. Lặp lại cho Dev Bucket**

Tạo CloudFront distribution thứ 2 cho dev bucket (optional):
- Origin: `anyrent-images-dev.s3.ap-southeast-1.amazonaws.com`
- CNAME: `images-dev.anyrent.shop` (optional)
- Hoặc dùng cùng domain với path-based routing

---

## ⚙️ Bước 6: Cấu Hình Environment Variables

### **6.1. Development Environment**

```bash
NODE_ENV=development
AWS_S3_BUCKET_NAME=anyrent-images-dev
AWS_CLOUDFRONT_DOMAIN=images-dev.anyrent.shop  # Optional
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### **6.2. Production Environment**

```bash
NODE_ENV=production
# AWS_S3_BUCKET_NAME sẽ auto-select: anyrent-images-pro
AWS_CLOUDFRONT_DOMAIN=images.anyrent.shop
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Lưu ý**: Nếu không set `AWS_S3_BUCKET_NAME`, code sẽ tự động chọn:
- `NODE_ENV=production` → `anyrent-images-pro`
- `NODE_ENV=development` → `anyrent-images-dev`

---

## ✅ Bước 7: Test Setup

### **7.1. Upload Test Image**

Upload một image qua API và kiểm tra:

```bash
# Upload image
curl -X POST https://api.anyrent.shop/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.jpg"
```

### **7.2. Verify URLs**

Response sẽ trả về CloudFront URL:
```json
{
  "success": true,
  "data": {
    "url": "https://images.anyrent.shop/staging/image-1234567890-abc123.jpg"
  }
}
```

### **7.3. Test Image Access**

Mở URL trong browser:
```
https://images.anyrent.shop/staging/image-1234567890-abc123.jpg
```

✅ Nếu thấy image → Setup thành công!

---

## 🔍 Troubleshooting

### **Problem 1: 403 Forbidden khi access image**

**Nguyên nhân**: Bucket policy chưa đúng hoặc CloudFront OAC chưa config

**Giải pháp**:
1. Kiểm tra bucket policy có allow CloudFront service principal
2. Kiểm tra CloudFront Origin Access Control settings
3. Verify Distribution ID trong bucket policy

### **Problem 2: SSL Certificate Error**

**Nguyên nhân**: Certificate chưa validate hoặc region sai

**Giải pháp**:
1. Đảm bảo certificate được tạo ở **us-east-1** region
2. Verify DNS records đã được thêm đúng
3. Đợi certificate status = **Issued**

### **Problem 3: DNS không resolve**

**Nguyên nhân**: CNAME record chưa propagate

**Giải pháp**:
1. Kiểm tra CNAME record trong DNS provider
2. Đợi DNS propagation (có thể mất 24-48h)
3. Test với `dig` hoặc `nslookup`

### **Problem 4: Images không hiển thị sau khi commit**

**Nguyên nhân**: CloudFront cache hoặc path không đúng

**Giải pháp**:
1. Invalidate CloudFront cache:
   ```
   Paths: /products/*
   ```
2. Kiểm tra file đã được copy từ staging → products chưa
3. Verify S3 key path đúng format

---

## 📊 CloudFront Cache Invalidation

Khi cần clear cache (sau khi update images):

1. Vào **CloudFront** → Distribution
2. Tab **Invalidations**
3. Click **Create invalidation**
4. **Object paths**:
   ```
   /products/*
   /staging/*
   ```
5. Click **Create invalidation**

**⏱️ Invalidation time**: 1-5 phút

---

## 💰 Cost Optimization

### **CloudFront Pricing**

- **Data transfer out**: ~$0.085/GB (first 10TB)
- **HTTPS requests**: ~$0.010 per 10,000 requests
- **Invalidation**: First 1,000 paths/month free, sau đó $0.005/path

### **S3 Pricing**

- **Storage**: ~$0.023/GB/month (Standard storage)
- **PUT requests**: ~$0.005 per 1,000 requests
- **GET requests**: ~$0.0004 per 1,000 requests

### **Tips để giảm cost**:

1. ✅ Enable CloudFront caching (giảm S3 requests)
2. ✅ Use CloudFront compression
3. ✅ Set appropriate Cache-Control headers
4. ✅ Cleanup staging files thường xuyên
5. ✅ Use S3 Lifecycle policies để archive old files

---

## 🔐 Security Best Practices

1. ✅ **Bucket Policy**: Chỉ allow CloudFront access (không public trực tiếp)
2. ✅ **IAM Roles**: Dùng IAM roles thay vì access keys khi có thể
3. ✅ **HTTPS Only**: CloudFront redirect HTTP → HTTPS
4. ✅ **CORS**: Configure CORS properly nếu cần
5. ✅ **CloudFront Signed URLs**: Optional cho private content

---

## 📝 Checklist

- [ ] Tạo 2 S3 buckets: `anyrent-images-dev`, `anyrent-images-pro`
- [ ] Config bucket policies (public read hoặc CloudFront OAC)
- [ ] Tạo SSL certificate ở `us-east-1` region
- [ ] Validate certificate via DNS
- [ ] Tạo CloudFront distribution cho production bucket
- [ ] Config custom domain: `images.anyrent.shop`
- [ ] Tạo CNAME record trong DNS
- [ ] Update bucket policy với CloudFront Distribution ARN
- [ ] Set environment variables
- [ ] Test upload và access images
- [ ] Verify CloudFront URLs hoạt động

---

## 🎉 Kết Quả

Sau khi setup xong:

✅ **Image URLs sẽ là**:
```
https://images.anyrent.shop/products/merchant-1/image-1234567890-abc123.jpg
```

✅ **Shorter, cleaner URLs**
✅ **Faster loading** (CDN caching)
✅ **HTTPS by default**
✅ **Custom domain** (professional)

---

## 📚 References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Certificate Manager Documentation](https://docs.aws.amazon.com/acm/)

