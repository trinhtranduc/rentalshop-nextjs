# 🚂 Railway Manual Deploy Guide

## 🔄 Trigger Manual Deploy

### **Option 1: Railway Dashboard (Recommended)**

1. **Mở Railway Dashboard:**
   - Development: https://railway.app/project/[your-project]/environments/development
   - Production: https://railway.app/project/[your-project]/environments/production

2. **Chọn API Service:**
   - Click vào service **API** (hoặc **apis**)

3. **Trigger Redeploy:**
   - Click tab **Deployments**
   - Click button **"Redeploy"** hoặc **"Deploy Latest"**
   - Hoặc click **"..."** menu → **"Redeploy"**

4. **Check Build Logs:**
   - Watch build logs để đảm bảo build thành công
   - Look for: `✓ Compiled successfully`
   - Look for: `Creating an optimized production build...`

### **Option 2: Railway CLI**

```bash
# Login to Railway
railway login

# Link to project (if not already linked)
cd apps/api
railway link

# Trigger redeploy
railway up

# Or redeploy specific service
railway up --service apis --environment development
```

### **Option 3: Push Empty Commit (Trigger Auto-Deploy)**

```bash
# Create empty commit to trigger Railway auto-deploy
git commit --allow-empty -m "chore: trigger Railway deployment"
git push origin dev
```

## 🔍 Check Railway Branch Configuration

Railway có thể đang watch branch `main` thay vì `dev`:

1. **Railway Dashboard:**
   - Go to **Settings** → **Service** → **Deploy**
   - Check **"Branch"** setting
   - Nếu là `main`, cần:
     - Option A: Change to `dev` branch
     - Option B: Merge `dev` → `main` và push

2. **Check Current Branch:**
   ```bash
   # Check which branch Railway is watching
   railway status
   ```

## 🚀 Quick Fix: Merge to Main

Nếu Railway chỉ watch `main` branch:

```bash
# Merge dev → main
git checkout main
git merge dev
git push origin main

# Railway sẽ tự động deploy từ main branch
```

## ✅ Verify Deployment

Sau khi deploy xong:

1. **Check API Health:**
   ```bash
   curl https://api.anyrent.shop/api/health
   ```

2. **Check CORS:**
   - Test login từ Vercel preview URL
   - Check browser console không còn CORS error

3. **Check Railway Logs:**
   ```bash
   railway logs --service apis --tail 50
   ```

## 🐛 Troubleshooting

### **Issue: Railway không auto-deploy**

**Solution:**
1. Check Railway Dashboard → Settings → Deploy → Branch
2. Đảm bảo branch đúng (`dev` hoặc `main`)
3. Check GitHub integration đã connect chưa
4. Trigger manual deploy nếu cần

### **Issue: Build failed**

**Solution:**
1. Check Railway logs để xem lỗi
2. Verify `apps/api/Dockerfile` exists
3. Check `apps/api/railway.json` configuration
4. Verify all dependencies in `package.json`

### **Issue: CORS still not working**

**Solution:**
1. Verify code đã được deploy (check Railway logs)
2. Check `apps/api/lib/cors.ts` có Vercel URL chưa
3. Restart Railway service:
   ```bash
   railway restart --service apis
   ```
4. Clear browser cache và test lại
