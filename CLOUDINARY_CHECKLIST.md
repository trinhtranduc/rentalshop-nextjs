# ✅ Cloudinary Setup Checklist

## 📦 Backend Setup (API Service)

### ✅ 1. Package Dependencies
- [x] `cloudinary` package installed (`apps/api/package.json` line 23)
- [x] Version: `^2.7.0`

### ✅ 2. Upload API Endpoint
- [x] File: `apps/api/app/api/upload/image/route.ts`
- [x] Authentication: ✅ `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])`
- [x] Cloudinary config check: ✅ `isCloudinaryConfigured()`
- [x] Upload flow:
  - [x] Primary: Cloudinary with auto-optimization
  - [x] Fallback 1: Local storage (`/public/uploads`)
  - [x] Fallback 2: Base64 (emergency)
- [x] Image transformations:
  - [x] Max dimensions: 1200x900
  - [x] Quality: `auto:good`
  - [x] Format: `auto` (WebP/AVIF)
  - [x] Thumbnails: 400x300, 800x600

### ✅ 3. Environment Variables Required
```bash
# Railway API Service → Variables Tab
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

---

## 🎨 Frontend Setup (Client/Admin Apps)

### ✅ 4. Upload Utility
- [x] File: `packages/utils/src/api/upload.ts`
- [x] Functions exported:
  - [x] `uploadImage()` - Single image upload with progress
  - [x] `uploadImages()` - Multiple images upload
  - [x] `validateImage()` - Client-side validation
  - [x] `resizeImage()` - Client-side optimization
  - [x] `getImageDimensions()` - Get image size
  - [x] `fileToBase64()` - Fallback converter

### ✅ 5. ProductForm Integration
- [x] File: `packages/ui/src/components/forms/ProductForm.tsx`
- [x] Import: `uploadImage` from `@rentalshop/utils` (line 27)
- [x] Features:
  - [x] Drag & drop upload
  - [x] Progress tracking
  - [x] Client-side resize (1200x900 max)
  - [x] Validation (type, size)
  - [x] Multiple images support (max 3)
  - [x] Preview before upload
  - [x] Remove uploaded images

### ✅ 6. Environment Variables Required
```bash
# Railway Client Service → Variables Tab
NEXT_PUBLIC_API_URL=https://apis-development.up.railway.app

# Railway Admin Service → Variables Tab  
NEXT_PUBLIC_API_URL=https://apis-development.up.railway.app
```

**Note**: `NEXT_PUBLIC_` prefix is required for client-side access in Next.js

---

## 📋 Configuration Files

### ✅ 7. Environment Templates
- [x] `env.example` - Updated with:
  - [x] `CLOUDINARY_CLOUD_NAME`
  - [x] `CLOUDINARY_API_KEY`
  - [x] `CLOUDINARY_API_SECRET`
  - [x] `NEXT_PUBLIC_API_URL` (for client-side uploads)

### ✅ 8. Documentation
- [x] `CLOUDINARY_SETUP.md` - Complete setup guide
- [x] `CLOUDINARY_CHECKLIST.md` - This file

---

## 🚀 Deployment Steps

### Step 1: Create Cloudinary Account (5 min)
- [ ] Visit https://cloudinary.com/users/register_free
- [ ] Sign up (email + password)
- [ ] Verify email
- [ ] Login to dashboard

### Step 2: Get Credentials (1 min)
- [ ] Go to https://console.cloudinary.com/
- [ ] Copy **Cloud name**
- [ ] Copy **API Key**
- [ ] Copy **API Secret** (click 👁️ to reveal)

### Step 3: Configure Railway API Service (2 min)
- [ ] Open Railway Dashboard
- [ ] Select **API service** (apps/api)
- [ ] Go to **Variables** tab
- [ ] Add `CLOUDINARY_CLOUD_NAME`
- [ ] Add `CLOUDINARY_API_KEY`
- [ ] Add `CLOUDINARY_API_SECRET`
- [ ] Wait for auto-redeploy (~2-3 min)

### Step 4: Configure Railway Client Service (1 min)
- [ ] Select **Client service** (apps/client)
- [ ] Go to **Variables** tab
- [ ] Add `NEXT_PUBLIC_API_URL=https://apis-development.up.railway.app`
- [ ] Wait for auto-redeploy

### Step 5: Configure Railway Admin Service (1 min)
- [ ] Select **Admin service** (apps/admin)
- [ ] Go to **Variables** tab
- [ ] Add `NEXT_PUBLIC_API_URL=https://apis-development.up.railway.app`
- [ ] Wait for auto-redeploy

### Step 6: Test Upload (2 min)
- [ ] Visit your app: `https://client-development.up.railway.app`
- [ ] Login with test account
- [ ] Go to **Products** → **Add Product**
- [ ] Upload an image (drag & drop or browse)
- [ ] Verify success message
- [ ] Check image displays in product list
- [ ] Check Railway API logs: "✅ Image uploaded to Cloudinary"

### Step 7: Verify Cloudinary Dashboard (1 min)
- [ ] Go to https://console.cloudinary.com/
- [ ] Navigate to **Media Library**
- [ ] Check folder `rentalshop/products`
- [ ] Verify uploaded images are there
- [ ] Click image to see transformations (400px, 800px, 1200px)

---

## 🔍 Testing Checklist

### Local Development
- [ ] Set Cloudinary env vars in `.env.local`
- [ ] Start dev server: `yarn dev`
- [ ] Test single image upload
- [ ] Test multiple images upload (max 3)
- [ ] Test drag & drop
- [ ] Test file browser
- [ ] Test image preview
- [ ] Test image removal
- [ ] Test validation (file type, size)
- [ ] Check console: "✅ Image uploaded to Cloudinary"

### Production (Railway)
- [ ] Upload image on production
- [ ] Verify image URL: `https://res.cloudinary.com/...`
- [ ] Test image loads fast (CDN)
- [ ] Test on mobile (responsive images)
- [ ] Test on slow connection (auto-optimization)
- [ ] Check Railway logs: "✅ Image uploaded to Cloudinary"

### Fallback Testing
- [ ] Remove Cloudinary env vars from Railway
- [ ] Test upload (should use local storage)
- [ ] Check image URL: `/uploads/...`
- [ ] Re-add Cloudinary env vars
- [ ] Test upload (should use Cloudinary again)

---

## 🐛 Troubleshooting

### Issue: "Cloudinary not configured"
**Check:**
- [ ] All 3 Cloudinary env vars added to Railway API service
- [ ] No typos in env var names
- [ ] No extra spaces in env var values
- [ ] Railway redeployed after adding env vars

**Fix:**
```bash
# Railway → API Service → Variables → Check:
CLOUDINARY_CLOUD_NAME=your_cloud_name  ✅ No quotes
CLOUDINARY_API_KEY=123456789012345     ✅ No quotes  
CLOUDINARY_API_SECRET=abc123xyz        ✅ No quotes
```

### Issue: "Upload failed"
**Check:**
- [ ] `NEXT_PUBLIC_API_URL` set in Client/Admin service
- [ ] API URL is correct (no trailing slash)
- [ ] User is authenticated (has token)
- [ ] File size < 5MB
- [ ] File type is allowed (JPEG, PNG, WebP, GIF)

**Debug:**
```javascript
// Check in browser console:
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
// Should show: https://apis-development.up.railway.app

// Check network tab:
// Should see POST to: https://apis-development.up.railway.app/api/upload/image
```

### Issue: "Invalid signature"
**Check:**
- [ ] API Secret copied correctly (click 👁️ to reveal full secret)
- [ ] No extra spaces or line breaks in secret

**Fix:**
1. Go to Cloudinary Dashboard
2. Copy API Secret again (full string)
3. Update `CLOUDINARY_API_SECRET` on Railway
4. Redeploy API service

### Issue: Images not loading after upload
**Check:**
- [ ] Image URL in response (check network tab)
- [ ] If Cloudinary URL → CORS issue?
- [ ] If local URL → file permissions?
- [ ] If base64 URL → fallback mode (check Cloudinary config)

**Debug:**
```bash
# Check Railway API logs:
railway logs --service api

# Look for:
✅ Image uploaded to Cloudinary  # Success
⚠️ Cloudinary not configured     # Missing env vars
⚠️ Using base64 fallback         # Upload failed
```

---

## 📊 Monitoring

### Cloudinary Dashboard
- [ ] Monitor storage usage: https://console.cloudinary.com/
- [ ] Check bandwidth usage (25GB free/month)
- [ ] Review transformations count (25K free/month)
- [ ] Set up usage alerts (optional)

### Railway Logs
```bash
# View API logs:
railway logs --service api

# Look for:
✅ Image uploaded to Cloudinary
⚠️ Cloudinary upload failed, falling back to local storage
❌ Upload error: ...
```

---

## ✅ Final Checklist

Before going live:

- [ ] Cloudinary account created
- [ ] All 3 Cloudinary env vars set on Railway API
- [ ] `NEXT_PUBLIC_API_URL` set on Railway Client & Admin
- [ ] All services redeployed
- [ ] Test upload works on production
- [ ] Images load from Cloudinary CDN
- [ ] Responsive images working (mobile/desktop)
- [ ] Usage monitoring setup

---

## 🎉 Success Criteria

You know it's working when:

1. ✅ Upload shows progress bar
2. ✅ Console logs: "✅ Image uploaded to Cloudinary"
3. ✅ Image URL starts with: `https://res.cloudinary.com/...`
4. ✅ Image loads fast on mobile and desktop
5. ✅ Cloudinary Dashboard shows images in `rentalshop/products`
6. ✅ Image transformations generated (400px, 800px, 1200px)

---

**🚀 Total setup time: ~15 minutes**
**📦 No code changes needed - everything is ready!**

