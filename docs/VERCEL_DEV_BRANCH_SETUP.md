# 🔧 Vercel Dev Branch Setup Guide

## Vấn đề

Khi deploy branch `dev` trên Vercel, nó sẽ fallback về **Production** environment variables, dẫn đến:
- ❌ Dùng `NEXT_PUBLIC_API_URL=https://api.anyrent.shop` (production API)
- ❌ Nên dùng `NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop` (development API)

## Giải pháp: Setup Development Environment cho Branch `dev`

### Step 1: Vào Vercel Dashboard

1. Go to **Settings** → **Environment Variables**
2. Click **Add New**

### Step 2: Thêm Development Variables cho Branch `dev`

Thêm các variables sau và chọn **Development** environment:

```
NODE_ENV=development
NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
NEXTAUTH_SECRET=<same-secret-as-railway-dev-api>
NEXTAUTH_URL=https://dev-adminvercel.anyrent.shop
SKIP_ENV_VALIDATION=true
```

**Quan trọng:**
1. ✅ Chọn checkbox **Development** (KHÔNG chọn Production hay Preview)
2. ✅ Khi Vercel hỏi **"Which branch should this apply to?"** → Nhập: `dev`
3. ✅ Variables này chỉ áp dụng cho branch `dev`

### Step 3: Verify Setup

Sau khi setup xong:
- ✅ Branch `dev` → Sử dụng Development variables → `NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop`
- ✅ Branch `main`/`master` → Sử dụng Production variables → `NEXT_PUBLIC_API_URL=https://api.anyrent.shop`
- ✅ Preview deployments từ branch `dev` → Sử dụng Development variables

### Step 4: Redeploy Branch `dev`

1. Go to **Deployments** tab
2. Tìm deployment từ branch `dev`
3. Click **"..."** → **"Redeploy"**
4. Hoặc push một commit mới lên branch `dev`

### Step 5: Verify API URL

Sau khi redeploy, check:
1. Mở preview URL từ branch `dev`
2. Open browser DevTools → Console
3. Check network requests → Should call `https://dev-api.anyrent.shop`

## Alternative: Đổi tên Branch

Nếu muốn dùng tên branch `development` thay vì `dev`:

```bash
# Rename branch locally
git branch -m dev development

# Push new branch
git push origin development

# Delete old branch
git push origin --delete dev
```

Sau đó setup Development environment cho branch `development` (theo docs/VERCEL_DEPLOYMENT.md)

## Environment Variables Summary

| Branch | Environment | API URL | Domain |
|--------|-------------|---------|--------|
| `main`/`master` | Production | `https://api.anyrent.shop` | `adminvercel.anyrent.shop` |
| `dev` | Development | `https://dev-api.anyrent.shop` | Preview URL |
| `development` | Development | `https://dev-api.anyrent.shop` | `dev-adminvercel.anyrent.shop` |
| Other branches | Production (fallback) | `https://api.anyrent.shop` | Preview URL |

## Troubleshooting

### Issue: Branch `dev` vẫn dùng Production API

**Solution:**
1. Check Vercel Dashboard → Settings → Environment Variables
2. Verify Development variables có branch `dev` được chỉ định
3. Redeploy branch `dev`
4. Check deployment logs để verify environment variables được apply đúng

### Issue: CORS error từ dev branch

**Solution:**
1. Verify Railway dev API có CORS config cho Vercel preview URLs
2. Check `packages/utils/src/cors.ts` có pattern matching cho Vercel preview URLs
3. Redeploy Railway dev API nếu cần
