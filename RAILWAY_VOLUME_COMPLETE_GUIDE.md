# 🚀 Railway Volume - Complete Setup Guide

## 📋 Overview

Railway Volume provides **persistent storage** for your application files. It's perfect for storing user-uploaded images without external dependencies.

### ✅ **Advantages**
- **100% Free** - No storage costs
- **Persistent** - Files survive deployments
- **Fast** - Local access, no network latency
- **Simple** - No API keys or complex setup
- **Unlimited** - No storage limits

## 🛠️ Setup Instructions

### 1. **Enable Railway Volume**

1. Go to your Railway project dashboard
2. Select your API service
3. Go to **Settings** → **Volumes**
4. Click **"Add Volume"**
5. Set:
   - **Mount Path**: `/app/public/uploads`
   - **Name**: `uploads-volume`
   - **Size**: 1GB (minimum)

### 2. **Deploy with Volume**

```bash
# Deploy your changes
git add .
git commit -m "feat: Add Railway Volume support for image uploads"
git push origin main
```

### 3. **Verify Setup**

```bash
# Test Railway Volume (run on Railway)
node scripts/test-railway-volume.js
```

## 📁 File Structure

```
/app/
├── apps/
│   └── api/
│       ├── public/
│       │   └── uploads/          # ← Railway Volume mounted here
│       │       ├── products/     # Product images
│       │       ├── avatars/      # User avatars
│       │       └── temp/         # Temporary files
│       └── next.config.js        # Static file serving
└── scripts/
    └── test-railway-volume.js    # Test script
```

## 🔧 Configuration

### **Next.js Static File Serving**

```javascript
// apps/api/next.config.js
async rewrites() {
  return [
    {
      source: '/uploads/:path*',
      destination: '/public/uploads/:path*',
    },
  ];
}
```

### **Dockerfile Volume Mount**

```dockerfile
# Create uploads directory for Railway Volume mount
RUN mkdir -p ./apps/api/public/uploads

# Note: Railway Volume will be mounted at /app/public/uploads via Railway Dashboard
```

### **API Upload Endpoint**

```typescript
// apps/api/app/api/upload/image/route.ts
const UPLOAD_FOLDER = '/app/public/uploads'; // Railway Volume mount point

async function uploadToRailwayVolume(file: File, buffer: Buffer) {
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(UPLOAD_FOLDER, filename);
  
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`; // Public URL
}
```

## 🧪 Testing

### **Local Testing**

```bash
# Test upload endpoint
curl -X POST http://localhost:3002/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-image.jpg"
```

### **Production Testing**

```bash
# Test on Railway
curl -X POST https://your-api.railway.app/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-image.jpg"
```

### **Verify File Access**

```bash
# Check if file is accessible
curl https://your-api.railway.app/uploads/1234567890-test-image.jpg
```

## 📊 Performance

### **File Size Limits**
- **Single file**: 5MB maximum
- **Total storage**: Unlimited (Railway limit)
- **Concurrent uploads**: No limit

### **Supported Formats**
- **Images**: JPEG, PNG, WebP, GIF
- **Compression**: Client-side optimization
- **Resize**: Automatic resizing to 1200x900

## 🔒 Security

### **File Validation**
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

### **Access Control**
- **Authentication required** for uploads
- **Role-based permissions** (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
- **File type validation** prevents malicious uploads

## 🚨 Troubleshooting

### **Volume Not Mounted**
```bash
# Check if volume is accessible
ls -la /app/public/uploads
```

### **Permission Denied**
```bash
# Fix permissions
chmod 755 /app/public/uploads
chown -R nextjs:nextjs /app/public/uploads
```

### **Files Not Accessible**
1. Check Next.js rewrite rules
2. Verify file paths
3. Check Railway Volume status

### **Upload Fails**
1. Check file size limits
2. Verify file type
3. Check authentication
4. Review error logs

## 📈 Monitoring

### **Check Volume Usage**
```bash
# Check disk usage
df -h /app/public/uploads

# Count files
find /app/public/uploads -type f | wc -l
```

### **Logs**
```bash
# Check upload logs
railway logs --service api | grep "upload"
```

## 🔄 Migration from Base64

If you're migrating from base64 storage:

1. **Export existing images** from database
2. **Upload to Railway Volume** using the API
3. **Update database** with new URLs
4. **Test image access**

## 🎯 Best Practices

### **File Organization**
```
uploads/
├── products/
│   ├── 2024/
│   │   ├── 01/
│   │   └── 02/
├── avatars/
└── temp/
```

### **Naming Convention**
```
{timestamp}-{randomString}.{extension}
Example: 1703123456789-abc123def456.jpg
```

### **Cleanup Strategy**
- **Temporary files**: Auto-delete after 24h
- **Orphaned files**: Weekly cleanup job
- **Old files**: Archive after 1 year

## 🚀 Next Steps

1. **Enable Railway Volume** in your project
2. **Deploy the changes**
3. **Test image uploads**
4. **Monitor storage usage**
5. **Set up cleanup jobs** (optional)

## 📞 Support

- **Railway Docs**: https://docs.railway.app/
- **Volume Guide**: https://docs.railway.app/storage/volumes
- **Issues**: Check Railway dashboard logs

---

**🎉 You're all set! Railway Volume is now ready for image uploads.**
