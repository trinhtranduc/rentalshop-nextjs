# 🖼️ Cloudinary Setup Guide for RentalShop

## 📋 Overview

RentalShop uses **Cloudinary** for product image storage and optimization with these benefits:

- ✅ **Free 25GB storage + 25GB bandwidth/month**
- ✅ **Global CDN** for fast image delivery
- ✅ **Auto optimization** (WebP, AVIF, compression)
- ✅ **Responsive images** (auto-resize based on device)
- ✅ **Image transformations** (crop, resize, filters)
- ✅ **Automatic fallback** to local storage if Cloudinary fails

---

## 🚀 Quick Setup (5 minutes)

### **Step 1: Create Free Cloudinary Account**

1. Visit: https://cloudinary.com/users/register_free
2. Fill in registration form:
   - Email
   - Password
   - Choose "Developer" as role
3. Verify email
4. Login to Cloudinary Console

### **Step 2: Get Your Credentials**

1. Go to Dashboard: https://console.cloudinary.com/
2. You'll see **Account Details** section with:

```
Cloud name: your_cloud_name_here
API Key: 123456789012345
API Secret: abcdefghijklmnopqrstuvwxyz123456
```

3. **Copy these 3 values** - you'll need them next

### **Step 3a: Setup for Railway (Production)**

1. Go to Railway Dashboard: https://railway.app/
2. Select your **API service**
3. Click **Variables** tab
4. Click **+ New Variable** and add:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

5. Railway will **auto-redeploy** your API service
6. Wait for deployment to complete (~2-3 minutes)

### **Step 3b: Setup for Local Development**

1. Create `.env.local` in project root:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456

# Other local env vars...
DATABASE_URL=postgresql://postgres:password@localhost:5432/rentalshop
NEXT_PUBLIC_API_URL=http://localhost:3002
```

2. Restart your local dev server:

```bash
yarn dev
```

---

## ✅ Verify Setup

### **Test Upload Locally:**

1. Start dev server: `yarn dev`
2. Login to app: http://localhost:3000
3. Go to **Products** → **Add Product**
4. Upload an image (drag & drop or browse)
5. Check console logs:

```bash
# Success:
✅ Image uploaded to Cloudinary
Image URL: https://res.cloudinary.com/your_cloud_name/image/upload/v1234567890/rentalshop/products/abc123.jpg

# Fallback (if Cloudinary not configured):
⚠️ Cloudinary not configured, using local storage
Image URL: /uploads/1234567890-abc123.jpg
```

### **Test Upload on Railway:**

1. Deploy to Railway
2. Visit your app: `https://client-development.up.railway.app`
3. Login and upload a product image
4. Check Railway logs (API service):

```bash
✅ Image uploaded to Cloudinary
```

5. Verify image loads in product list

---

## 📁 Upload Flow

```
┌─────────────────────────────────────────┐
│ User uploads image (drag & drop)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Client-side validation & resize         │
│ - Max 5MB                               │
│ - JPEG, PNG, WebP, GIF only            │
│ - Auto-resize to 1200x900 if larger   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Upload to API: POST /api/upload/image  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Try Cloudinary (primary)                │
│ - Auto optimize (quality: auto)        │
│ - Auto format (WebP/AVIF)              │
│ - Generate thumbnails (400px, 800px)  │
│ - CDN delivery                         │
└──────────────┬──────────────────────────┘
               │
        Success │ Fail
               ▼
┌─────────────────────────────────────────┐
│ Fallback to Local Storage              │
│ - Save to /public/uploads/             │
│ - Return local URL                     │
└──────────────┬──────────────────────────┘
               │
        Success │ Fail
               ▼
┌─────────────────────────────────────────┐
│ Ultimate Fallback: Base64              │
│ - Convert to base64 string             │
│ - Store inline (only for dev/testing)  │
└─────────────────────────────────────────┘
```

---

## 🎨 Cloudinary Features Used

### **1. Automatic Optimization**

```typescript
// Configured in: apps/api/app/api/upload/image/route.ts
transformation: [
  { width: 1200, height: 900, crop: 'limit' },  // Max size
  { quality: 'auto:good' },                     // Auto compress
  { fetch_format: 'auto' }                      // Auto WebP/AVIF
]
```

**Result**: Upload 5MB JPG → Cloudinary serves 200KB WebP 🚀

### **2. Responsive Images**

```typescript
// Multiple sizes generated automatically
eager: [
  { width: 400, height: 300, crop: 'fill' },   // Thumbnail
  { width: 800, height: 600, crop: 'limit' }   // Medium
]
```

**Result**: Mobile gets 400px, Desktop gets 1200px 📱💻

### **3. CDN Delivery**

All images served from nearest CDN edge location:
- Vietnam → Singapore edge (~20ms)
- US → US edge (~10ms)
- Europe → Europe edge (~15ms)

---

## 📊 Free Tier Limits

| Resource | Free Tier | Overage Cost |
|----------|-----------|--------------|
| Storage | 25 GB | $0.18/GB/month |
| Bandwidth | 25 GB/month | $0.11/GB |
| Transformations | 25,000/month | $1/1,000 |
| Video Storage | 0 GB | Not needed |

### **Estimation for RentalShop:**

**Scenario**: 1000 products × 3 images = 3000 images

| Item | Usage | Cost |
|------|-------|------|
| Storage (3000 × 2MB optimized) | 6 GB | FREE ✅ |
| Bandwidth (10K views/month) | ~12 GB | FREE ✅ |
| Transformations (view + thumbnails) | ~20K/month | FREE ✅ |
| **Total** | | **$0/month** 🎉 |

**You'll stay FREE** until you hit:
- ~12,500 products (25GB storage)
- ~50K page views/month (25GB bandwidth)

---

## 🔧 Configuration Files

### **Upload API Endpoint:**
`apps/api/app/api/upload/image/route.ts`

### **Upload Utility:**
`packages/utils/src/api/upload.ts`

### **ProductForm Integration:**
`packages/ui/src/components/forms/ProductForm.tsx`

---

## 🐛 Troubleshooting

### **Error: "Cloudinary not configured"**

**Cause**: Missing environment variables

**Fix**:
1. Check Railway Variables tab has all 3 Cloudinary env vars
2. Redeploy API service
3. Check logs for "✅ Image uploaded to Cloudinary"

### **Error: "Invalid signature"**

**Cause**: Wrong API Secret

**Fix**:
1. Go to Cloudinary Dashboard
2. Copy API Secret again (click "👁️ Reveal" button)
3. Update `CLOUDINARY_API_SECRET` on Railway
4. Redeploy

### **Images not loading after upload**

**Cause**: CORS or URL issue

**Fix**:
1. Check image URL in browser console
2. If URL is `https://res.cloudinary.com/...` → Cloudinary works ✅
3. If URL is `/uploads/...` → Using local fallback (check Cloudinary config)
4. If URL is `data:image/...` → Using base64 fallback (check upload API)

### **Upload slow or timing out**

**Cause**: Large image file

**Fix**:
1. Client already auto-resizes to 1200x900
2. Check image file size < 5MB
3. If still slow, reduce `maxWidth/maxHeight` in ProductForm.tsx

---

## 🎯 Next Steps

1. ✅ **Create Cloudinary account** (free)
2. ✅ **Add credentials to Railway** (3 env vars)
3. ✅ **Test upload** (add product with image)
4. ✅ **Monitor usage** (Cloudinary Dashboard → Reports)

---

## 📚 Resources

- Cloudinary Dashboard: https://console.cloudinary.com/
- Cloudinary Docs: https://cloudinary.com/documentation
- Image Optimization Guide: https://cloudinary.com/documentation/image_optimization
- Railway Dashboard: https://railway.app/

---

**🎉 Done! Your product images now have CDN delivery, auto-optimization, and responsive sizing!**

