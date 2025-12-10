# 🔧 S3 Troubleshooting Guide

## ❓ Tại sao không thấy images mới sau khi tạo product?

### 🔍 Nguyên nhân có thể:

1. **Code chưa được restart/deploy**
   - Code mới đã update nhưng server chưa restart
   - Cần restart API server để áp dụng code mới

2. **Structure mới khác structure cũ**
   - **Structure cũ**: `staging/` và `product/` ở root level
   - **Structure mới**: `env/prod/staging/` và `env/prod/products/merchant-{id}/outlet-{id}/`
   - Files mới sẽ ở folder khác với files cũ

3. **Commit staging → production chưa thành công**
   - Check logs để xem có lỗi khi commit không
   - Staging files sẽ không tự động chuyển sang production

## ✅ Giải pháp

### 1. **Restart/Deploy Code**

```bash
# Development
# Stop server và restart lại

# Production (Railway/Deployment)
# Deploy lại code mới
```

### 2. **Check Logs**

Khi tạo product, check logs để xem:
- ✅ Staging key được tạo đúng không: `env/prod/staging/...`
- ✅ Commit staging → production có thành công không
- ✅ Production key được tạo: `env/prod/products/merchant-{id}/outlet-{id}/...`

### 3. **Check S3 Structure**

Với structure mới, files sẽ ở:
```
anyrent-images/
├── env/
│   ├── prod/              # Nếu NODE_ENV=production
│   │   ├── staging/       # Files tạm thời
│   │   └── products/      # Files production
│   │       └── merchant-{id}/
│   │           └── outlet-{id}/
│   │
│   └── dev/               # Nếu NODE_ENV=development
│       ├── staging/
│       └── products/
```

**Lưu ý**: 
- Không cần tạo folder `env/prod/` manual trong S3
- S3 tự động tạo folders khi upload files
- Chỉ cần đảm bảo code đã được deploy và restart

### 4. **Verify Structure trong Code**

Check environment variable:
```bash
# Production
NODE_ENV=production  # → Tạo `env/prod/...`

# Development  
NODE_ENV=development # → Tạo `env/dev/...`
```

### 5. **Check S3 Console**

Trong S3 console, navigate vào:
- `env/` folder
- `env/prod/` hoặc `env/dev/` (tùy environment)
- `env/prod/staging/` - Files tạm thời
- `env/prod/products/merchant-{id}/outlet-{id}/` - Files production

## 🔄 Migration từ Structure Cũ

Nếu bạn có files ở structure cũ (`staging/`, `product/`), chúng sẽ vẫn hoạt động bình thường. Code đã được update để support cả 2 structures:

- ✅ Old structure: `staging/...` và `product/...`
- ✅ New structure: `env/prod/staging/...` và `env/prod/products/...`

## 🐛 Debug Steps

### Step 1: Check Upload Logs

```bash
# Trong API logs, tìm:
📸 Uploading image: {
  stagingKey: "env/prod/staging/upload-image-1234567890-abc123.jpg"
  ...
}
```

### Step 2: Check Commit Logs

```bash
# Trong API logs, tìm:
✅ Copied env/prod/staging/... → env/prod/products/merchant-1/outlet-2/...
🗑️ Deleted staging file: env/prod/staging/...
```

### Step 3: Verify trong S3

1. Vào S3 Console
2. Navigate vào `env/` folder
3. Check `env/prod/staging/` - Files tạm thời
4. Check `env/prod/products/merchant-{id}/outlet-{id}/` - Files production

### Step 4: Check Product Data

Trong database, product.images sẽ chứa URLs:
```json
{
  "images": [
    "https://cloudfront-domain.com/env/prod/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg"
  ]
}
```

## ⚠️ Common Issues

### Issue 1: Files chỉ ở staging, không commit sang production

**Nguyên nhân**: `commitStagingFiles` bị fail

**Giải pháp**:
- Check logs để xem error
- Verify staging keys có đúng format không
- Check S3 permissions

### Issue 2: Không thấy folder `env/` trong S3

**Nguyên nhân**: Code chưa được deploy hoặc chưa có upload mới

**Giải pháp**:
- Deploy code mới
- Upload image mới sẽ tự động tạo folder `env/`

### Issue 3: Files ở structure cũ (`staging/`, `product/`)

**Nguyên nhân**: Code cũ vẫn đang chạy

**Giải pháp**:
- Restart API server
- Deploy code mới
- Files mới sẽ dùng structure mới

## 📝 Checklist

Khi không thấy images mới, check:

- [ ] API server đã được restart sau khi update code?
- [ ] Check logs xem upload có thành công không?
- [ ] Check logs xem commit staging → production có thành công không?
- [ ] Check S3 console ở đúng folder: `env/prod/` hoặc `env/dev/`?
- [ ] Check NODE_ENV variable đúng chưa?
- [ ] Check product.images trong database có URLs không?
- [ ] Verify CloudFront/S3 URLs có accessible không?

## 🚀 Quick Fix

Nếu vẫn không thấy images:

1. **Restart API server**
2. **Upload image mới** → Check logs
3. **Tạo product mới** → Check commit logs
4. **Verify trong S3** → Check `env/prod/products/...`

## 📞 Support

Nếu vẫn có vấn đề:
- Check API logs chi tiết
- Verify S3 bucket permissions
- Check AWS credentials
- Verify NODE_ENV setting

