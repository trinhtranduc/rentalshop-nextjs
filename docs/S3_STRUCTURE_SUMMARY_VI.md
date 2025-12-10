# 📁 Tóm Tắt: Cấu Trúc Thư Mục S3 - Recommended Structure

## 🎯 Mục Đích

Tài liệu này đề xuất cấu trúc thư mục S3 cho hệ thống Rental Shop với các mục tiêu:
- ✅ Phân tách rõ ràng giữa development, staging, và production
- ✅ Tổ chức theo loại hình ảnh (products, avatars, documents)
- ✅ Hỗ trợ multi-tenant (phân theo merchant/outlet)
- ✅ Dễ dàng quản lý, backup, và cleanup
- ✅ Tối ưu cho CloudFront CDN

## 📂 Cấu Trúc Đề Xuất

```
s3-bucket/
│
├── env/
│   ├── dev/                    # Development environment
│   │   ├── staging/            # Upload tạm thời (chờ commit)
│   │   ├── products/           # Hình sản phẩm
│   │   │   └── merchant-{id}/
│   │   │       └── outlet-{id}/
│   │   ├── avatars/            # Ảnh đại diện
│   │   │   ├── users/
│   │   │   ├── merchants/
│   │   │   └── outlets/
│   │   ├── documents/          # Tài liệu
│   │   └── temp/               # File tạm (auto cleanup)
│   │
│   ├── staging/                # Staging environment
│   └── prod/                   # Production environment
```

## 🚀 Cách Sử Dụng

### 1. Import Helper Functions

```typescript
import {
  generateProductImageKey,
  generateUserAvatarKey,
  generateStagingKey,
  generateFileName,
  getS3Environment
} from '@rentalshop/utils';
```

### 2. Upload Product Image

```typescript
// Generate filename với timestamp và random ID
const fileName = generateFileName('product-image');

// Generate S3 key với structure đầy đủ
const key = generateProductImageKey(
  merchantId: 1,
  fileName,
  outletId: 2  // Optional
);

// Upload với key này
// Key sẽ là: 'env/prod/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg'
```

### 3. Upload Avatar

```typescript
// User avatar
const fileName = generateFileName(`user-${userId}`);
const key = generateUserAvatarKey(fileName);
// Key: 'env/prod/avatars/users/user-5-1234567890-abc123.jpg'

// Merchant avatar
const key = generateMerchantAvatarKey(fileName);
// Key: 'env/prod/avatars/merchants/merchant-1-1234567890-abc123.jpg'

// Outlet avatar
const key = generateOutletAvatarKey(fileName);
// Key: 'env/prod/avatars/outlets/outlet-2-1234567890-abc123.jpg'
```

### 4. Workflow: Staging → Production

```typescript
// Bước 1: Upload vào staging
const stagingKey = generateStagingKey(fileName);
await uploadToS3(file, { folder: 'staging', fileName });

// Bước 2: Sau khi validate và tạo product thành công
const productionKey = generateProductImageKey(merchantId, fileName, outletId);
await commitStagingFiles([stagingKey], productionKey);
```

## 📋 Các Helper Functions Chính

### Generate Keys
- `generateProductImageKey(merchantId, fileName, outletId?, environment?)`
- `generateUserAvatarKey(fileName, environment?)`
- `generateMerchantAvatarKey(fileName, environment?)`
- `generateOutletAvatarKey(fileName, environment?)`
- `generateStagingKey(fileName, environment?)`
- `generateDocumentKey(subType, fileName, environment?)`

### Parse & Extract
- `parseS3Key(key)` - Parse key để extract thông tin
- `extractMerchantIdFromKey(key)` - Extract merchant ID
- `extractOutletIdFromKey(key)` - Extract outlet ID
- `isStagingKey(key)` - Check nếu là staging key

### Utilities
- `getS3Environment()` - Detect environment hiện tại
- `generateFileName(prefix, extension)` - Generate filename với timestamp
- `sanitizeFilename(filename)` - Sanitize filename cho S3

## 🔍 Ví Dụ Đường Dẫn Thực Tế

### Development
```
env/dev/staging/product-image-1234567890-abc123.jpg
env/dev/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg
env/dev/avatars/users/user-5-1234567890-abc123.jpg
```

### Production
```
env/prod/staging/product-image-1234567890-abc123.jpg
env/prod/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg
env/prod/avatars/users/user-5-1234567890-abc123.jpg
```

## ✨ Lợi Ích

1. **Rõ Ràng**: Dễ biết file thuộc môi trường nào, merchant nào
2. **Bảo Mật**: Dễ implement access control theo merchant
3. **Quản Lý**: Dễ backup/restore theo merchant hoặc environment
4. **Performance**: CloudFront có thể cache tốt hơn với structure rõ ràng
5. **Cleanup**: Dễ cleanup staging/temp files theo environment

## 🔄 Migration Plan

Nếu đang dùng structure cũ:

1. **Phase 1**: Uploads mới sử dụng structure mới
2. **Phase 2**: Migrate files cũ từng merchant một
3. **Phase 3**: Update database records
4. **Phase 4**: Cleanup structure cũ

## 📚 Tài Liệu Chi Tiết

- `docs/S3_FOLDER_STRUCTURE.md` - Chi tiết cấu trúc và rationale
- `docs/S3_USAGE_EXAMPLES.md` - Ví dụ code cụ thể
- `packages/utils/src/utils/s3-path-helper.ts` - Source code của helpers

## 🎯 Quick Reference

```typescript
// Product image với merchant + outlet
generateProductImageKey(merchantId, fileName, outletId)

// User avatar
generateUserAvatarKey(fileName)

// Staging (temporary upload)
generateStagingKey(fileName)

// Parse key để lấy info
parseS3Key(key)

// Check environment
getS3Environment() // 'dev' | 'staging' | 'prod'
```

## 📝 Notes

- Structure này tự động detect environment từ `NODE_ENV`
- Có thể override environment bằng parameter
- Filename tự động có timestamp và random ID để tránh conflict
- Tất cả paths đều lowercase, dùng dấu gạch ngang (-)

