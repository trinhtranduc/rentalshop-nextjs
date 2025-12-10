# 📝 S3 Folder Structure - Usage Examples

## 🎯 Tổng Quan

Tài liệu này cung cấp các ví dụ cụ thể về cách sử dụng S3 folder structure helper trong codebase.

## 📚 Import Helper Functions

```typescript
import {
  generateFolderPath,
  generateS3Key,
  generateFileName,
  generateProductImageKey,
  generateAvatarKey,
  generateStagingKey,
  parseS3Key,
  getS3Environment,
  type FolderPathOptions,
  type GenerateKeyOptions
} from '@rentalshop/utils';
```

## 📸 Upload Product Image

### Ví dụ 1: Upload Product Image với Merchant và Outlet

```typescript
import { uploadToS3 } from '@rentalshop/utils';
import { generateProductImageKey, generateFileName } from '@rentalshop/utils';

async function uploadProductImage(
  file: Buffer,
  merchantId: number,
  outletId: number,
  originalFileName?: string
) {
  // Generate filename
  const fileName = originalFileName 
    ? generateFileName(originalFileName.replace(/\.[^/.]+$/, ''))
    : generateFileName('product-image');
  
  // Generate S3 key with proper structure
  const key = generateProductImageKey(merchantId, fileName, outletId);
  
  // Upload to S3
  const result = await uploadToS3(file, {
    folder: '', // Empty folder, we'll use full key path
    fileName: fileName,
    contentType: 'image/jpeg'
  });
  
  return result;
}
```

### Ví dụ 2: Upload Product Image - Staging → Production Workflow

```typescript
import { uploadToS3, commitStagingFiles } from '@rentalshop/utils';
import { 
  generateStagingKey, 
  generateProductImageKey,
  generateFileName 
} from '@rentalshop/utils';

async function uploadProductImageWithStaging(
  file: Buffer,
  merchantId: number,
  outletId: number,
  originalFileName?: string
) {
  // Step 1: Generate staging filename and key
  const fileName = originalFileName
    ? generateFileName(originalFileName.replace(/\.[^/.]+$/, ''))
    : generateFileName('product-image');
  
  const stagingKey = generateStagingKey(fileName);
  
  // Step 2: Upload to staging
  const uploadResult = await uploadToS3(file, {
    folder: 'staging', // Use staging folder
    fileName: fileName,
    contentType: 'image/jpeg'
  });
  
  if (!uploadResult.success || !uploadResult.data) {
    throw new Error('Upload failed');
  }
  
  // Step 3: After product is created, commit to production
  // This would be called when product creation is confirmed
  const productionKey = generateProductImageKey(merchantId, fileName, outletId);
  
  const commitResult = await commitStagingFiles(
    [stagingKey],
    productionKey.split('/').slice(0, -1).join('/') // Extract folder path
  );
  
  return {
    stagingKey,
    productionKey,
    commitResult
  };
}
```

## 👤 Upload Avatar

### Ví dụ 3: Upload User Avatar

```typescript
import { uploadToS3 } from '@rentalshop/utils';
import { generateUserAvatarKey, generateFileName } from '@rentalshop/utils';

async function uploadUserAvatar(file: Buffer, userId: number) {
  const fileName = generateFileName(`user-${userId}`);
  const key = generateUserAvatarKey(fileName);
  
  const result = await uploadToS3(file, {
    folder: '', // Use full key path
    fileName: fileName,
    contentType: 'image/jpeg'
  });
  
  return result;
}
```

### Ví dụ 4: Upload Merchant Avatar

```typescript
import { uploadToS3 } from '@rentalshop/utils';
import { generateMerchantAvatarKey, generateFileName } from '@rentalshop/utils';

async function uploadMerchantAvatar(file: Buffer, merchantId: number) {
  const fileName = generateFileName(`merchant-${merchantId}`);
  const key = generateMerchantAvatarKey(fileName);
  
  const result = await uploadToS3(file, {
    folder: '',
    fileName: fileName,
    contentType: 'image/jpeg'
  });
  
  return result;
}
```

### Ví dụ 5: Upload Outlet Avatar

```typescript
import { uploadToS3 } from '@rentalshop/utils';
import { generateOutletAvatarKey, generateFileName } from '@rentalshop/utils';

async function uploadOutletAvatar(file: Buffer, outletId: number) {
  const fileName = generateFileName(`outlet-${outletId}`);
  const key = generateOutletAvatarKey(fileName);
  
  const result = await uploadToS3(file, {
    folder: '',
    fileName: fileName,
    contentType: 'image/jpeg'
  });
  
  return result;
}
```

## 📄 Upload Document

### Ví dụ 6: Upload Invoice Document

```typescript
import { uploadToS3 } from '@rentalshop/utils';
import { generateDocumentKey, generateFileName } from '@rentalshop/utils';

async function uploadInvoice(file: Buffer, invoiceNumber: string) {
  const fileName = generateFileName(`invoice-${invoiceNumber}`, 'pdf');
  const key = generateDocumentKey('invoice', fileName);
  
  const result = await uploadToS3(file, {
    folder: '',
    fileName: fileName,
    contentType: 'application/pdf'
  });
  
  return result;
}
```

## 🔍 Parse và Validate S3 Keys

### Ví dụ 7: Parse S3 Key để Extract Information

```typescript
import { parseS3Key, extractMerchantIdFromKey } from '@rentalshop/utils';

function validateUserAccess(key: string, userMerchantId: number): boolean {
  const parsed = parseS3Key(key);
  
  // Check if it's a product image
  if (parsed.imageType === 'product') {
    // Verify merchant access
    if (parsed.merchantId && parsed.merchantId !== userMerchantId) {
      return false; // User trying to access other merchant's files
    }
  }
  
  return true;
}

// Extract merchant ID from key
const key = 'env/prod/products/merchant-1/outlet-2/product-image-1234567890-abc123.jpg';
const merchantId = extractMerchantIdFromKey(key);
console.log(merchantId); // Output: 1
```

### Ví dụ 8: Check if Key is Staging

```typescript
import { isStagingKey } from '@rentalshop/utils';

function cleanupStagingFile(key: string) {
  if (isStagingKey(key)) {
    // This is a staging file, safe to delete
    return deleteFromS3(key);
  } else {
    // Production file, don't delete automatically
    console.warn('Attempted to delete production file:', key);
    return false;
  }
}
```

## 🔄 Migration từ Structure Cũ

### Ví dụ 9: Migrate Existing Files

```typescript
import { parseS3Key, generateProductImageKey } from '@rentalshop/utils';
import { copyObject, deleteObject } from '@aws-sdk/client-s3';

async function migrateProductImage(
  oldKey: string,
  merchantId: number,
  outletId: number
) {
  // Parse old key to extract filename
  const parsed = parseS3Key(oldKey);
  const fileName = parsed.fileName;
  
  // Generate new key with new structure
  const newKey = generateProductImageKey(merchantId, fileName, outletId);
  
  // Copy to new location
  await copyObject({
    Bucket: BUCKET_NAME,
    CopySource: `${BUCKET_NAME}/${oldKey}`,
    Key: newKey
  });
  
  // Delete old file after successful copy
  await deleteObject({
    Bucket: BUCKET_NAME,
    Key: oldKey
  });
  
  return newKey;
}
```

## 🎛️ Update Existing Upload Routes

### Ví dụ 10: Update Product Upload Route

```typescript
// apps/api/app/api/products/route.ts
import { uploadToS3 } from '@rentalshop/utils';
import { 
  generateStagingKey, 
  generateFileName,
  getS3Environment 
} from '@rentalshop/utils';

export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  // ... existing code ...
  
  // Get merchant and outlet from user scope
  const merchantId = userScope.merchantId;
  const outletId = userScope.outletId;
  
  // Upload images with new structure
  const uploadedImages: string[] = [];
  
  for (const file of imageFiles) {
    // Generate filename
    const fileName = generateFileName(
      file.name.replace(/\.[^/.]+$/, '') || 'product-image'
    );
    
    // Generate staging key
    const stagingKey = generateStagingKey(fileName);
    
    // Upload to staging
    const uploadResult = await uploadToS3(buffer, {
      folder: 'staging', // Or use full key: stagingKey
      fileName: fileName,
      contentType: 'image/jpeg'
    });
    
    if (uploadResult.success && uploadResult.data) {
      uploadedImages.push(uploadResult.data.url);
      
      // Store staging key for later commit
      // You might want to store this in a temporary table or session
    }
  }
  
  // ... rest of product creation logic ...
  
  // After product is created, commit staging files
  if (uploadedImages.length > 0 && merchantId && outletId) {
    const stagingKeys = uploadedImages.map(url => {
      // Extract key from URL (you might need a helper for this)
      return extractKeyFromUrl(url);
    });
    
    // Commit to production folder
    const commitResult = await commitStagingFiles(
      stagingKeys,
      generateFolderPath({
        imageType: 'product',
        merchantId,
        outletId
      })
    );
  }
});
```

### Ví dụ 11: Update Avatar Upload Route

```typescript
// apps/api/app/api/users/[id]/avatar/route.ts
import { uploadToS3 } from '@rentalshop/utils';
import { generateUserAvatarKey, generateFileName } from '@rentalshop/utils';

export const POST = withPermissions(['users.manage'])(async (request, { user, userScope }) => {
  const formData = await request.formData();
  const file = formData.get('avatar') as File;
  
  // Convert to buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Generate filename and key
  const fileName = generateFileName(`user-${user.id}`);
  const key = generateUserAvatarKey(fileName);
  
  // Upload directly to production (avatars don't need staging)
  const result = await uploadToS3(buffer, {
    folder: '', // Use full key path
    fileName: fileName,
    contentType: 'image/jpeg'
  });
  
  if (result.success && result.data) {
    // Update user record with new avatar URL
    await updateUserAvatar(user.id, result.data.url);
    
    return NextResponse.json({
      success: true,
      data: { avatarUrl: result.data.url }
    });
  }
});
```

## 🔧 Helper Functions để Extract Key từ URL

```typescript
/**
 * Extract S3 key from CloudFront or S3 URL
 */
function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove leading slash
    const key = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    
    // Remove query parameters if any
    return key.split('?')[0];
  } catch {
    return null;
  }
}
```

## 📊 Environment-Specific Examples

### Development
```typescript
// Automatically uses 'dev' environment
const key = generateProductImageKey(1, 'image.jpg', 2);
// Result: 'env/dev/products/merchant-1/outlet-2/image.jpg'
```

### Staging
```typescript
// Explicitly set staging environment
const key = generateProductImageKey(1, 'image.jpg', 2, 'staging');
// Result: 'env/staging/products/merchant-1/outlet-2/image.jpg'
```

### Production
```typescript
// Explicitly set production environment
const key = generateProductImageKey(1, 'image.jpg', 2, 'prod');
// Result: 'env/prod/products/merchant-1/outlet-2/image.jpg'
```

## 🎯 Best Practices

1. **Always use helper functions** instead of hardcoding paths
2. **Use staging workflow** for product images (upload → validate → commit)
3. **Upload avatars directly** to production (no staging needed)
4. **Validate merchant/outlet access** before allowing file operations
5. **Parse keys** to extract information instead of string manipulation
6. **Use environment-aware functions** to ensure correct folder structure

## 🔄 Migration Checklist

- [ ] Update all product image uploads to use new structure
- [ ] Update all avatar uploads to use new structure
- [ ] Migrate existing files from old structure
- [ ] Update database records with new URLs
- [ ] Test staging → production commit workflow
- [ ] Verify CloudFront CDN still works correctly
- [ ] Update cleanup jobs to respect new structure
- [ ] Monitor storage usage per environment

