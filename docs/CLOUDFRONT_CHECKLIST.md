# ✅ CloudFront Setup Checklist

Checklist để kiểm tra và troubleshoot CloudFront configuration cho product images.

## 🔍 **1. Environment Variables Check**

### **Development Environment**
```bash
# Kiểm tra các biến môi trường
echo $NODE_ENV                    # Phải là: development
echo $AWS_S3_BUCKET_NAME         # Phải là: anyrent-images-dev (hoặc để trống để auto-select)
echo $AWS_CLOUDFRONT_DOMAIN      # Phải là: dev-images.anyrent.shop (hoặc CloudFront domain mặc định)
echo $AWS_REGION                 # Phải là: ap-southeast-1
echo $AWS_ACCESS_KEY_ID          # Phải có giá trị
echo $AWS_SECRET_ACCESS_KEY      # Phải có giá trị
```

### **Production Environment**
```bash
echo $NODE_ENV                    # Phải là: production
echo $AWS_S3_BUCKET_NAME         # Phải là: anyrent-images-pro (hoặc để trống để auto-select)
echo $AWS_CLOUDFRONT_DOMAIN      # Phải là: images.anyrent.shop (hoặc CloudFront domain mặc định)
echo $AWS_REGION                 # Phải là: ap-southeast-1
```

**✅ Checklist:**
- [ ] `AWS_CLOUDFRONT_DOMAIN` được set đúng
- [ ] `AWS_S3_BUCKET_NAME` đúng với environment
- [ ] `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY` có giá trị
- [ ] `AWS_REGION` đúng (ap-southeast-1)

---

## 🌐 **2. DNS Configuration Check**

### **2.1. Check DNS Resolution**
```bash
# Kiểm tra DNS resolution cho custom domain
dig dev-images.anyrent.shop
# Hoặc
nslookup dev-images.anyrent.shop
# Hoặc
host dev-images.anyrent.shop
```

**Expected Result:**
```
dev-images.anyrent.shop has address XXX.XXX.XXX.XXX
# Hoặc CNAME trỏ về CloudFront domain: d1234567890.cloudfront.net
```

**✅ Checklist:**
- [ ] DNS record tồn tại (CNAME hoặc A record)
- [ ] DNS record trỏ đúng về CloudFront distribution domain
- [ ] DNS đã propagate (có thể mất 5-30 phút)

### **2.2. Check DNS Record Type**
- **CNAME Record** (Recommended):
  ```
  Type: CNAME
  Name: dev-images (hoặc images cho production)
  Value: d1234567890.cloudfront.net
  TTL: 3600 (1 hour)
  ```

- **A Record** (Nếu dùng Route 53 Alias):
  ```
  Type: A (Alias)
  Name: dev-images
  Alias Target: CloudFront distribution
  ```

**✅ Checklist:**
- [ ] DNS record type đúng (CNAME hoặc A Alias)
- [ ] Record name đúng (`dev-images` cho dev, `images` cho prod)
- [ ] Record value trỏ về CloudFront distribution domain

---

## ☁️ **3. AWS CloudFront Configuration Check**

### **3.1. Check CloudFront Distribution**
1. Vào **AWS Console** → **CloudFront**
2. Tìm distribution cho `anyrent-images-dev` hoặc `anyrent-images-pro`
3. Kiểm tra các settings:

**✅ Checklist:**
- [ ] Distribution status là **Deployed** (không phải In Progress)
- [ ] Distribution domain name: `d1234567890.cloudfront.net` (ghi lại domain này)
- [ ] Origin domain: `anyrent-images-dev.s3.ap-southeast-1.amazonaws.com` (hoặc prod bucket)
- [ ] Origin path: `/` (empty)
- [ ] Viewer protocol policy: **Redirect HTTP to HTTPS** hoặc **HTTPS Only**

### **3.2. Check Alternate Domain Names (CNAMEs)**
1. Vào distribution → Tab **General** → Click **Edit**
2. Kiểm tra **Alternate Domain Names (CNAMEs)**:

**✅ Checklist:**
- [ ] Custom domain đã được thêm: `dev-images.anyrent.shop` (dev) hoặc `images.anyrent.shop` (prod)
- [ ] SSL certificate đã được chọn (phải là certificate ở `us-east-1` region)
- [ ] Certificate status là **Issued** (không phải Pending)

### **3.3. Check SSL Certificate**
1. Vào **AWS Console** → **Certificate Manager** (region: `us-east-1`)
2. Tìm certificate cho `*.anyrent.shop` hoặc `anyrent.shop`

**✅ Checklist:**
- [ ] Certificate tồn tại và status là **Issued**
- [ ] Certificate ở region **us-east-1** (bắt buộc cho CloudFront)
- [ ] Certificate bao gồm domain: `*.anyrent.shop` (wildcard) hoặc `dev-images.anyrent.shop`
- [ ] Certificate đã được validate (DNS hoặc Email)

---

## 🪣 **4. S3 Bucket Configuration Check**

### **4.1. Check Bucket Exists**
```bash
# List buckets
aws s3 ls

# Check bucket exists
aws s3 ls s3://anyrent-images-dev/
aws s3 ls s3://anyrent-images-pro/
```

**✅ Checklist:**
- [ ] Bucket `anyrent-images-dev` tồn tại (cho development)
- [ ] Bucket `anyrent-images-pro` tồn tại (cho production)
- [ ] Bucket ở region `ap-southeast-1`

### **4.2. Check Bucket Policy**
1. Vào **AWS Console** → **S3** → Chọn bucket
2. Tab **Permissions** → **Bucket Policy**

**✅ Checklist:**
- [ ] Bucket policy cho phép CloudFront access (OAC hoặc OAI)
- [ ] CloudFront Distribution ARN được thêm vào policy
- [ ] Policy có `s3:GetObject` permission

**Example Policy:**
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

### **4.3. Check Bucket Public Access**
**✅ Checklist:**
- [ ] Block Public Access: **Enabled** (recommended - CloudFront sẽ access qua OAC/OAI)
- [ ] Hoặc nếu public: Bucket policy cho phép public read

---

## 🧪 **5. Test Image Upload & Access**

### **5.1. Test Upload Image**
```bash
# Test upload qua API
curl -X POST https://dev-api.anyrent.shop/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "data={\"name\":\"Test Product\",\"images\":[]}" \
  -F "images=@test-image.jpg"
```

**Check Response:**
- [ ] Upload thành công (status 200)
- [ ] Response có `images` field với URLs
- [ ] URLs sử dụng custom domain: `https://dev-images.anyrent.shop/...`

### **5.2. Test Image Access**
```bash
# Test access image qua custom domain
curl -I https://dev-images.anyrent.shop/products/merchant-17/image.jpg

# Test access qua CloudFront domain mặc định
curl -I https://d1234567890.cloudfront.net/products/merchant-17/image.jpg

# Test access qua S3 URL (fallback)
curl -I https://anyrent-images-dev.s3.ap-southeast-1.amazonaws.com/products/merchant-17/image.jpg
```

**Expected Results:**
- [ ] Custom domain: `HTTP/2 200` hoặc `HTTP/2 403` (nếu bucket private)
- [ ] CloudFront domain: `HTTP/2 200`
- [ ] S3 URL: `HTTP/1.1 200 OK` hoặc `HTTP/1.1 403 Forbidden`

**✅ Checklist:**
- [ ] Image có thể access qua CloudFront domain mặc định
- [ ] Image có thể access qua custom domain (nếu DNS đã propagate)
- [ ] Image có thể access qua S3 URL (fallback)

---

## 🔧 **6. Troubleshooting Common Issues**

### **Issue 1: ERR_NAME_NOT_RESOLVED**
**Symptom:** `GET https://dev-images.anyrent.shop/... net::ERR_NAME_NOT_RESOLVED`

**Causes:**
- DNS record chưa được tạo
- DNS chưa propagate (chờ 5-30 phút)
- DNS record sai (CNAME trỏ sai domain)

**Solutions:**
1. ✅ Check DNS record tồn tại: `dig dev-images.anyrent.shop`
2. ✅ Verify CNAME value trỏ về CloudFront domain
3. ✅ Chờ DNS propagate (có thể mất đến 48 giờ)
4. ✅ Temporary fix: Dùng CloudFront domain mặc định thay vì custom domain

### **Issue 2: 403 Forbidden**
**Symptom:** `HTTP/2 403` khi access image

**Causes:**
- Bucket policy không cho phép CloudFront access
- CloudFront OAC/OAI chưa được config
- Bucket private nhưng không có CloudFront access

**Solutions:**
1. ✅ Check bucket policy có CloudFront Service Principal
2. ✅ Verify CloudFront Distribution ARN trong bucket policy
3. ✅ Check Origin Access Control (OAC) hoặc Origin Access Identity (OAI) được config

### **Issue 3: SSL Certificate Error**
**Symptom:** Browser warning về SSL certificate

**Causes:**
- Certificate chưa được validate
- Certificate không bao gồm domain
- Certificate ở sai region (phải là us-east-1)

**Solutions:**
1. ✅ Verify certificate status là **Issued**
2. ✅ Check certificate includes domain: `*.anyrent.shop` hoặc `dev-images.anyrent.shop`
3. ✅ Verify certificate ở region **us-east-1**

### **Issue 4: Images Not Showing After Upload**
**Symptom:** Product created successfully nhưng images không hiển thị

**Causes:**
- Image URLs sai format
- Domain không resolve
- Images chưa được commit từ staging → production

**Solutions:**
1. ✅ Check backend logs: `📤 Uploading`, `✅ Uploaded`, `🔄 Committing`, `✅ Committed`
2. ✅ Verify image URLs trong database có đúng format
3. ✅ Test access image URL trực tiếp
4. ✅ Check CloudFront distribution status là **Deployed**

---

## 📋 **7. Quick Verification Script**

Tạo file `check-cloudfront.sh`:

```bash
#!/bin/bash

echo "🔍 Checking CloudFront Configuration..."
echo ""

# 1. Check Environment Variables
echo "1️⃣ Environment Variables:"
echo "   NODE_ENV: ${NODE_ENV:-NOT SET}"
echo "   AWS_S3_BUCKET_NAME: ${AWS_S3_BUCKET_NAME:-AUTO-SELECT}"
echo "   AWS_CLOUDFRONT_DOMAIN: ${AWS_CLOUDFRONT_DOMAIN:-NOT SET}"
echo "   AWS_REGION: ${AWS_REGION:-NOT SET}"
echo ""

# 2. Check DNS Resolution
echo "2️⃣ DNS Resolution:"
if [ -n "$AWS_CLOUDFRONT_DOMAIN" ]; then
  echo "   Checking $AWS_CLOUDFRONT_DOMAIN..."
  dig +short $AWS_CLOUDFRONT_DOMAIN || echo "   ❌ DNS not resolved"
else
  echo "   ⚠️ AWS_CLOUDFRONT_DOMAIN not set"
fi
echo ""

# 3. Check S3 Bucket
echo "3️⃣ S3 Bucket:"
BUCKET_NAME=${AWS_S3_BUCKET_NAME:-$(node -e "const env = process.env.NODE_ENV || 'development'; console.log(env === 'production' ? 'anyrent-images-pro' : 'anyrent-images-dev')")}
echo "   Bucket: $BUCKET_NAME"
aws s3 ls s3://$BUCKET_NAME/ 2>&1 | head -5 || echo "   ❌ Cannot access bucket"
echo ""

# 4. Test Image Access (if URL provided)
if [ -n "$1" ]; then
  echo "4️⃣ Testing Image Access:"
  echo "   URL: $1"
  curl -I "$1" 2>&1 | head -3
fi

echo ""
echo "✅ Check complete!"
```

**Usage:**
```bash
chmod +x check-cloudfront.sh
./check-cloudfront.sh https://dev-images.anyrent.shop/products/merchant-17/test.jpg
```

---

## 🎯 **8. Summary Checklist**

**Before Production:**
- [ ] ✅ Environment variables set correctly
- [ ] ✅ DNS records created and propagated
- [ ] ✅ CloudFront distribution deployed
- [ ] ✅ SSL certificate issued and validated
- [ ] ✅ Bucket policy allows CloudFront access
- [ ] ✅ Test upload works
- [ ] ✅ Test image access works
- [ ] ✅ Custom domain resolves correctly
- [ ] ✅ No SSL warnings
- [ ] ✅ Images display correctly in frontend

**Quick Fix if Custom Domain Not Working:**
1. Temporarily remove `AWS_CLOUDFRONT_DOMAIN` from environment
2. Restart API server
3. Images will use CloudFront default domain: `https://d1234567890.cloudfront.net/...`
4. Fix DNS later and re-enable custom domain

---

## 📞 **9. Support Resources**

- **AWS CloudFront Docs:** https://docs.aws.amazon.com/cloudfront/
- **DNS Propagation Check:** https://www.whatsmydns.net/
- **SSL Certificate Check:** https://www.ssllabs.com/ssltest/
- **CloudFront Status:** https://status.aws.amazon.com/

---

**Last Updated:** 2025-01-20
**Maintained by:** Development Team

