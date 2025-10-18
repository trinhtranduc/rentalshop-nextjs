# 🚀 AWS S3 Setup Guide cho RentalShop

## 📋 **Tổng quan**

RentalShop sử dụng **AWS S3** làm phương thức upload chính với **Railway Volume** làm fallback để đảm bảo độ tin cậy cao.

## 💰 **Chi phí AWS S3**

| Số lượng hình | Storage | Requests | Transfer | **Tổng/tháng** |
|---------------|---------|----------|----------|----------------|
| 1,000 hình | $0.01 | $0.0004 | $0.09 | **~$0.10** |
| 5,000 hình | $0.05 | $0.002 | $0.45 | **~$0.50** |
| 10,000 hình | $0.11 | $0.004 | $0.90 | **~$1.00** |

## 🛠️ **Setup AWS S3**

### **Bước 1: Tạo AWS Account**
1. Vào [AWS Console](https://aws.amazon.com)
2. Đăng ký tài khoản (có 12 tháng free tier)
3. Xác thực thông tin thanh toán

### **Bước 2: Tạo S3 Bucket**
1. Vào **S3** service
2. Click **"Create bucket"**
3. Cấu hình:
   - **Bucket name**: `rentalshop-images` (hoặc tên khác)
   - **Region**: `US East (N. Virginia)` (rẻ nhất)
   - **Public access**: **Block all public access** (uncheck)
   - **Versioning**: Disabled
   - **Encryption**: Server-side encryption with Amazon S3 managed keys

### **Bước 3: Cấu hình Bucket Policy**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::rentalshop-images/*"
        }
    ]
}
```

### **Bước 4: Tạo IAM User**
1. Vào **IAM** service
2. Click **"Users"** → **"Create user"**
3. Username: `rentalshop-s3-user`
4. Attach policies: **"AmazonS3FullAccess"**
5. Tạo **Access Key** và **Secret Key**

### **Bước 5: Setup CloudFront (Optional)**
1. Vào **CloudFront** service
2. Click **"Create distribution"**
3. Origin domain: `rentalshop-images.s3.amazonaws.com`
4. Default root object: `index.html`
5. Caching: **CachingOptimized**
6. Price class: **Use only US, Canada and Europe**

## 🔧 **Cấu hình Environment Variables**

### **Railway Dashboard:**
```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=rentalshop-images
AWS_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
```

### **Local Development (.env.local):**
```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=rentalshop-images
AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

## 🚀 **Deploy và Test**

### **1. Deploy code:**
```bash
git add .
git commit -m "feat: add AWS S3 integration with Railway Volume fallback"
git push origin main
```

### **2. Test upload:**
```bash
# Test API endpoint
curl -X POST https://dev-apis-development.up.railway.app/api/health/volume
```

### **3. Kiểm tra logs:**
```bash
railway logs --service dev-apis
```

## 📊 **Monitoring**

### **AWS CloudWatch:**
- **S3 Metrics**: Storage, requests, data transfer
- **Billing**: Chi phí hàng tháng
- **Alerts**: Khi vượt ngân sách

### **Railway Logs:**
- **Upload success/failure**
- **Fallback usage**
- **Performance metrics**

## 🔒 **Security Best Practices**

### **1. IAM Permissions:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::rentalshop-images/*"
        }
    ]
}
```

### **2. CORS Configuration:**
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://your-domain.com"],
        "ExposeHeaders": []
    }
]
```

### **3. Lifecycle Rules:**
- **Transition to IA**: Sau 30 ngày
- **Transition to Glacier**: Sau 90 ngày
- **Delete**: Sau 365 ngày

## 🚨 **Troubleshooting**

### **Lỗi thường gặp:**

#### **1. Access Denied:**
```bash
# Kiểm tra IAM permissions
aws s3 ls s3://rentalshop-images
```

#### **2. Bucket not found:**
```bash
# Kiểm tra bucket name và region
aws s3 ls --region us-east-1
```

#### **3. CORS errors:**
```bash
# Kiểm tra CORS configuration
aws s3api get-bucket-cors --bucket rentalshop-images
```

### **Debug commands:**
```bash
# Test S3 connection
aws s3 ls s3://rentalshop-images

# Test upload
aws s3 cp test.jpg s3://rentalshop-images/test.jpg

# Test download
aws s3 cp s3://rentalshop-images/test.jpg ./downloaded.jpg
```

## 📈 **Performance Optimization**

### **1. CloudFront CDN:**
- **Cache TTL**: 1 year cho images
- **Compression**: Gzip enabled
- **HTTP/2**: Enabled

### **2. Image Optimization:**
- **Client-side compression**: 80% quality
- **Multiple sizes**: Thumbnail, medium, large
- **WebP format**: Modern browsers

### **3. Monitoring:**
- **CloudWatch alarms**: Khi có lỗi
- **Cost alerts**: Khi vượt budget
- **Performance metrics**: Response time

## 🎯 **Kết luận**

AWS S3 + Railway Volume fallback cung cấp:
- ✅ **High availability** (99.99% uptime)
- ✅ **CDN performance** (CloudFront)
- ✅ **Cost effective** ($0.10-1.00/tháng)
- ✅ **Scalable** (unlimited storage)
- ✅ **Reliable fallback** (Railway Volume)

**Setup time**: ~30 phút
**Monthly cost**: $0.10-1.00
**Reliability**: 99.99%
