# 📁 Cấu Trúc Thư Mục S3 - Recommended Structure

## 🎯 Tổng Quan

Tài liệu này mô tả cấu trúc thư mục S3 được khuyến nghị cho hệ thống Rental Shop, hỗ trợ:
- ✅ Phân tách theo môi trường (Development, Staging, Production)
- ✅ Phân loại theo loại hình ảnh (Products, Avatars, Documents, etc.)
- ✅ Tổ chức theo Merchant/Outlet cho multi-tenant
- ✅ Dễ dàng quản lý và cleanup
- ✅ Tối ưu cho CloudFront CDN

## 📂 Cấu Trúc Thư Mục

```
s3-bucket-name/
│
├── env/                          # Phân tách theo môi trường
│   ├── dev/                      # Development environment
│   │   ├── staging/              # Upload tạm thời (chờ commit)
│   │   ├── products/             # Hình sản phẩm
│   │   │   ├── merchant-{id}/    # Phân theo merchant
│   │   │   │   ├── outlet-{id}/  # Phân theo outlet (optional)
│   │   │   │   │   ├── image-{timestamp}-{random}.jpg
│   │   │   │   │   └── ...
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── avatars/              # Ảnh đại diện
│   │   │   ├── users/            # Avatar users
│   │   │   │   ├── user-{id}-{timestamp}-{random}.jpg
│   │   │   │   └── ...
│   │   │   ├── merchants/        # Logo merchant
│   │   │   │   ├── merchant-{id}-{timestamp}-{random}.jpg
│   │   │   │   └── ...
│   │   │   └── outlets/          # Logo outlet
│   │   │       ├── outlet-{id}-{timestamp}-{random}.jpg
│   │   │       └── ...
│   │   ├── documents/            # Tài liệu (PDF, DOC, etc.)
│   │   │   ├── contracts/        # Hợp đồng
│   │   │   ├── invoices/         # Hóa đơn
│   │   │   └── reports/          # Báo cáo
│   │   ├── temp/                 # File tạm (auto cleanup sau 24h)
│   │   └── backups/              # Backup files
│   │
│   ├── staging/                  # Staging environment (giống dev)
│   │   ├── staging/
│   │   ├── products/
│   │   ├── avatars/
│   │   ├── documents/
│   │   ├── temp/
│   │   └── backups/
│   │
│   └── prod/                     # Production environment
│       ├── staging/              # Upload tạm thời
│       ├── products/
│       │   ├── merchant-{id}/
│       │   │   ├── outlet-{id}/
│       │   │   └── ...
│       │   └── ...
│       ├── avatars/
│       │   ├── users/
│       │   ├── merchants/
│       │   └── outlets/
│       ├── documents/
│       │   ├── contracts/
│       │   ├── invoices/
│       │   └── reports/
│       ├── temp/
│       └── backups/
│
└── _archive/                     # Files đã xóa (soft delete)
    ├── products/
    ├── avatars/
    └── documents/
```

## 🔍 Chi Tiết Cấu Trúc

### 1. **Environment Folders** (`env/{environment}/`)
Phân tách rõ ràng giữa các môi trường để:
- ✅ Tránh nhầm lẫn giữa dev và production
- ✅ Dễ dàng cleanup theo môi trường
- ✅ Hỗ trợ testing riêng biệt

### 2. **Staging Folder** (`staging/`)
- Upload tạm thời trước khi commit
- Auto cleanup sau 24-48 giờ nếu không được commit
- Chỉ dùng trong quá trình upload, không phải storage lâu dài

### 3. **Products Folder** (`products/`)
```
products/
└── merchant-{merchantId}/
    └── outlet-{outletId}/  (optional, có thể bỏ qua nếu không cần)
        └── product-image-{timestamp}-{random}.jpg
```

**Lý do phân cấp:**
- ✅ Dễ quản lý theo merchant/outlet
- ✅ Hỗ trợ multi-tenant isolation
- ✅ Dễ backup/restore theo merchant
- ✅ Performance tốt hơn khi query theo merchant

### 4. **Avatars Folder** (`avatars/`)
```
avatars/
├── users/
│   └── user-{userId}-{timestamp}-{random}.jpg
├── merchants/
│   └── merchant-{merchantId}-{timestamp}-{random}.jpg
└── outlets/
    └── outlet-{outletId}-{timestamp}-{timestamp}-{random}.jpg
```

**Lý do phân loại:**
- ✅ Dễ tìm kiếm và quản lý
- ✅ Có thể áp dụng policy khác nhau cho từng loại
- ✅ Hỗ trợ CDN caching riêng

### 5. **Documents Folder** (`documents/`)
- Lưu các file không phải hình ảnh (PDF, DOC, XLS, etc.)
- Phân loại theo mục đích sử dụng

### 6. **Temp Folder** (`temp/`)
- File tạm thời
- Auto cleanup sau 24-48 giờ
- Dùng cho các file không cần lưu lâu dài

## 📝 Ví Dụ Đường Dẫn Hoàn Chỉnh

### Development Environment:
```
env/dev/staging/product-image-1234567890-abc123.jpg
env/dev/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg
env/dev/avatars/users/user-5-1234567890-abc123.jpg
env/dev/avatars/merchants/merchant-1-1234567890-abc123.jpg
env/dev/avatars/outlets/outlet-2-1234567890-abc123.jpg
```

### Production Environment:
```
env/prod/staging/product-image-1234567890-abc123.jpg
env/prod/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg
env/prod/avatars/users/user-5-1234567890-abc123.jpg
env/prod/avatars/merchants/merchant-1-1234567890-abc123.jpg
env/prod/avatars/outlets/outlet-2-1234567890-abc123.jpg
```

## 🔧 Implementation

### Environment Detection
```typescript
function getS3Environment(): 'dev' | 'staging' | 'prod' {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') return 'prod';
  if (env === 'staging') return 'staging';
  return 'dev';
}
```

### Folder Path Generation
```typescript
interface FolderPathOptions {
  environment?: 'dev' | 'staging' | 'prod';
  imageType: 'product' | 'avatar' | 'document' | 'temp';
  merchantId?: number;
  outletId?: number;
  subType?: 'user' | 'merchant' | 'outlet'; // For avatars
  docType?: 'contract' | 'invoice' | 'report'; // For documents
}

function generateFolderPath(options: FolderPathOptions): string {
  const env = options.environment || getS3Environment();
  const basePath = `env/${env}`;
  
  switch (options.imageType) {
    case 'product':
      if (options.merchantId && options.outletId) {
        return `${basePath}/products/merchant-${options.merchantId}/outlet-${options.outletId}`;
      } else if (options.merchantId) {
        return `${basePath}/products/merchant-${options.merchantId}`;
      }
      return `${basePath}/products`;
      
    case 'avatar':
      const avatarSubType = options.subType || 'users';
      return `${basePath}/avatars/${avatarSubType}`;
      
    case 'document':
      const docType = options.docType || 'contracts';
      return `${basePath}/documents/${docType}`;
      
    case 'temp':
      return `${basePath}/temp`;
      
    default:
      return `${basePath}/uploads`;
  }
}
```

## 📋 Best Practices

### 1. **Naming Convention**
- ✅ Sử dụng format: `{type}-{id}-{timestamp}-{random}.jpg`
- ✅ Timestamp: Unix timestamp (milliseconds)
- ✅ Random: 12-15 ký tự alphanumeric
- ✅ Luôn lowercase, dùng dấu gạch ngang (-)

### 2. **Staging Workflow**
1. Upload vào `staging/` folder
2. Validate và process
3. Commit vào folder chính thức (products, avatars, etc.)
4. Delete file trong `staging/` sau khi commit thành công

### 3. **Cleanup Strategy**
- **Staging files**: Auto cleanup sau 24-48 giờ
- **Temp files**: Auto cleanup sau 24 giờ
- **Archived files**: Giữ lại 90 ngày trước khi xóa hoàn toàn

### 4. **CDN & CloudFront**
- ✅ Tất cả files đều có thể truy cập qua CloudFront
- ✅ Sử dụng CloudFront URL cho tất cả responses
- ✅ Cache headers phù hợp cho từng loại file

### 5. **Multi-tenant Isolation**
- ✅ Luôn include `merchantId` trong path khi có thể
- ✅ API tự động thêm merchantId từ user context
- ✅ Không cho phép access cross-merchant

## 🔐 Security Considerations

### 1. **IAM Policy Example**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::bucket-name/env/${aws:userid}/*"
    }
  ]
}
```

### 2. **Bucket Policy**
- Chặn public access cho folders chứa sensitive data
- Chỉ cho phép access qua CloudFront hoặc presigned URLs
- Implement CORS cho CloudFront

### 3. **File Validation**
- Validate file type trước khi upload
- Validate file size (products: max 5MB, avatars: max 2MB)
- Sanitize filename để tránh path traversal

## 📊 Monitoring & Analytics

### 1. **Metrics to Track**
- Upload success/failure rate
- Storage usage per environment
- CDN hit/miss ratio
- Cleanup job execution

### 2. **Logging**
- Log tất cả upload/delete operations
- Include merchantId, outletId trong logs
- Track staging → production commits

## 🚀 Migration Plan

Nếu bạn đang dùng structure cũ, migration plan:

1. **Phase 1**: Implement new structure cho uploads mới
2. **Phase 2**: Migrate existing files theo từng merchant
3. **Phase 3**: Update database records với paths mới
4. **Phase 4**: Cleanup old structure sau khi verify

## 📝 Notes

- Structure này có thể mở rộng dễ dàng
- Có thể thêm folder mới cho các loại file khác
- Hỗ trợ cả single-tenant và multi-tenant
- Tương thích với CloudFront CDN

