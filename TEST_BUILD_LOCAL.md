# 🧪 Test Build Local - Hướng Dẫn Test Trước Khi Deploy Railway

## 📋 Tổng Quan

Script này mô phỏng **chính xác** quy trình build của Railway để bạn có thể test local trước khi deploy. Điều này giúp:

- ✅ Phát hiện lỗi build sớm
- ✅ Tiết kiệm thời gian deploy
- ✅ Đảm bảo build thành công trên Railway
- ✅ Verify tất cả packages và apps được build đúng

## 🚀 Cách Sử Dụng

### Option 1: Test Build Cơ Bản (Recommended)

```bash
# Test build đầy đủ (clean + install + build)
yarn test:build
```

Script sẽ:
1. ✅ Clean các build artifacts cũ
2. ✅ Install dependencies (với devDependencies như Railway)
3. ✅ Generate Prisma Client
4. ✅ Build tất cả packages
5. ✅ Build tất cả apps (api, admin, client)
6. ✅ Verify build outputs

### Option 2: Test Build Nhanh (Skip Clean)

```bash
# Test build mà không clean (nhanh hơn)
yarn test:build:quick
```

Sử dụng khi:
- Bạn đã clean trước đó
- Muốn test lại sau khi sửa code
- Tiết kiệm thời gian

### Option 3: Test Build + Start Apps

```bash
# Test build và thử start apps (mất thời gian hơn)
yarn test:build:full
```

Sử dụng khi:
- Muốn verify apps có thể start được
- Test production build hoàn chỉnh
- Verify trước khi deploy

## 📊 Output Mẫu

```
============================================================
🚀 Local Build Test (Railway Simulation)
============================================================

[1/6] Cleaning previous builds...
ℹ️  Running: rm -rf .turbo
✅ Build artifacts cleaned

[2/6] Installing dependencies...
ℹ️  Running: yarn install --frozen-lockfile
✅ Dependencies installed

[3/6] Generating Prisma Client...
ℹ️  Running: npx prisma generate --schema=./prisma/schema.prisma
✅ Prisma Client generated

[4/6] Building packages...
ℹ️  Building 11 packages...
✅ constants built successfully
✅ types built successfully
✅ ui built successfully
...
✅ Built 11/11 packages

[5/6] Building apps...
ℹ️  Building 3 apps...
✅ api built successfully
✅ admin built successfully
✅ client built successfully
✅ Built 3/3 apps

[6/6] Verifying build outputs...
✅ Package ui has build output
✅ Package utils has build output
✅ App api has build output
✅ App admin has build output
✅ App client has build output

Build Verification: 8/8 checks passed
🎉 All builds verified successfully!

============================================================
📊 Build Test Summary
============================================================

✅ Packages built: 11
✅ Apps built: 3
❌ Errors: 0

🎉 Build test PASSED! Ready for Railway deployment.
```

## 🔍 Troubleshooting

### Lỗi: "Package not found"

**Nguyên nhân**: Package chưa được install hoặc thiếu dependencies

**Giải pháp**:
```bash
# Clean và install lại
yarn clean:all
yarn install
yarn test:build
```

### Lỗi: "Prisma generate failed"

**Nguyên nhân**: Schema Prisma có vấn đề hoặc thiếu DATABASE_URL

**Giải pháp**:
```bash
# Check schema
npx prisma validate --schema=./prisma/schema.prisma

# Generate lại
npx prisma generate --schema=./prisma/schema.prisma
```

### Lỗi: "Build failed for package/ui"

**Nguyên nhân**: Circular dependencies hoặc missing dependencies

**Giải pháp**:
```bash
# Check package dependencies
cd packages/ui
yarn install
yarn build

# Check for circular imports
yarn lint
```

### Lỗi: "App build incomplete"

**Nguyên nhân**: Missing environment variables hoặc build errors

**Giải pháp**:
```bash
# Build app riêng để xem lỗi chi tiết
cd apps/api
yarn build

# Check Next.js config
cat apps/api/next.config.js
```

## 📝 Checklist Trước Khi Deploy Railway

Sau khi test build local thành công, đảm bảo:

- [ ] ✅ `yarn test:build` chạy thành công (0 errors)
- [ ] ✅ Tất cả packages có dist/ folder với files
- [ ] ✅ Tất cả apps có .next/ folder với BUILD_ID
- [ ] ✅ Prisma Client đã được generate
- [ ] ✅ Không có circular dependencies
- [ ] ✅ Environment variables đã được set trên Railway
- [ ] ✅ Database connection string đúng
- [ ] ✅ Railway.json config đúng

## 🔄 Quy Trình Build Railway vs Local

### Railway Build Process:
1. Install dependencies (`yarn install --frozen-lockfile`)
2. Generate Prisma (`npx prisma generate`)
3. Run migrations (`npx prisma migrate deploy`)
4. Build packages (`yarn build` - via Turbo)
5. Build apps (`yarn build` in each app)
6. Start apps (`yarn start`)

### Local Test Process:
1. ✅ Clean builds (optional)
2. ✅ Install dependencies
3. ✅ Generate Prisma
4. ✅ Build packages
5. ✅ Build apps
6. ✅ Verify outputs
7. ✅ Test start (optional)

**Khác biệt**: Local test không chạy migrations (cần database), nhưng verify build process giống hệt Railway.

## 💡 Tips

### 1. Test Thường Xuyên
```bash
# Sau mỗi thay đổi lớn, test build
yarn test:build:quick
```

### 2. Test Trước Commit
```bash
# Trước khi push code, test build
yarn test:build
```

### 3. Debug Build Issues
```bash
# Build từng package riêng để debug
cd packages/ui
yarn build

# Build từng app riêng
cd apps/api
yarn build
```

### 4. Compare với Railway
```bash
# Railway logs sẽ show tương tự
railway logs --service api
```

## 🎯 Kết Luận

Script `test-build-local.js` giúp bạn:

1. ✅ **Phát hiện lỗi sớm** - Trước khi deploy Railway
2. ✅ **Tiết kiệm thời gian** - Không phải chờ Railway build fail
3. ✅ **Đảm bảo chất lượng** - Verify tất cả packages và apps
4. ✅ **Tự tin deploy** - Biết chắc build sẽ thành công

**Luôn chạy `yarn test:build` trước khi deploy Railway!** 🚀

