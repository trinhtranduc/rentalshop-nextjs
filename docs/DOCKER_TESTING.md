# Docker Testing Guide for Admin App

Hướng dẫn test build và deploy admin app bằng Docker để debug trước khi deploy lên Vercel.

## 🎯 Mục đích

- **Xem full build logs** - Không bị truncate như Vercel
- **Test build process** - Đảm bảo build thành công trước khi push
- **Debug nhanh hơn** - Test local không cần chờ Vercel
- **Reproduce errors** - Tái tạo lỗi build trong môi trường giống Vercel

## 🚀 Quick Start

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
# Test build với full logs
yarn test:admin:docker

# Build log sẽ được lưu tại: /tmp/admin-docker-build.log
```

### Cách 2: Sử dụng docker-compose trực tiếp

```bash
# Build image
yarn docker:admin:build

# Start container
yarn docker:admin:up

# View logs
yarn docker:admin:logs

# Stop container
yarn docker:admin:down
```

### Cách 3: Sử dụng Docker commands trực tiếp

```bash
# Build với full output
docker-compose -f docker-compose.admin.yml build --progress=plain

# Run container
docker-compose -f docker-compose.admin.yml up

# View logs
docker-compose -f docker-compose.admin.yml logs -f admin
```

## 📋 Environment Variables

Set environment variables trước khi build:

```bash
# Development
export NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
export NEXT_PUBLIC_APP_ENV=development

# Production
export NEXT_PUBLIC_API_URL=https://api.anyrent.shop
export NEXT_PUBLIC_APP_ENV=production
```

Hoặc tạo file `.env.docker`:

```bash
NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
NEXT_PUBLIC_APP_ENV=development
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3001
```

Load env file:

```bash
export $(cat .env.docker | xargs) && yarn test:admin:docker
```

## 🔍 Xem Full Build Logs

### Method 1: Real-time logs

```bash
# Build và xem logs real-time
docker-compose -f docker-compose.admin.yml build --progress=plain 2>&1 | tee build.log
```

### Method 2: Save to file

```bash
# Script tự động lưu log
yarn test:admin:docker

# Xem log file
cat /tmp/admin-docker-build.log
```

### Method 3: Docker build output

```bash
# Build với no-cache để xem tất cả steps
docker-compose -f docker-compose.admin.yml build --no-cache --progress=plain
```

## 🐛 Debugging Build Issues

### Issue 1: Module not found

**Error**: `Module not found: Can't resolve '@rentalshop/env'`

**Solution**:
1. Verify Dockerfile uses turbo filter:
   ```dockerfile
   RUN SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin
   ```
2. Check all packages are copied in Dockerfile
3. Verify workspace dependencies in package.json

### Issue 2: Build timeout

**Error**: Build takes too long

**Solution**:
```bash
# Build với no-cache first time only
docker-compose -f docker-compose.admin.yml build --no-cache

# Subsequent builds use cache
docker-compose -f docker-compose.admin.yml build
```

### Issue 3: Environment variable errors

**Error**: Missing environment variables

**Solution**:
1. Check `.env.docker` file exists
2. Verify variables are exported:
   ```bash
   echo $NEXT_PUBLIC_API_URL
   ```
3. Pass as build args:
   ```bash
   docker-compose -f docker-compose.admin.yml build \
     --build-arg NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
   ```

## 📊 So sánh với Vercel Build

| Aspect | Docker | Vercel |
|--------|--------|--------|
| **Full Logs** | ✅ Yes | ⚠️ Truncated |
| **Build Time** | ~5-10 min | ~3-5 min |
| **Cache** | ✅ Docker cache | ✅ Vercel cache |
| **Debug** | ✅ Easy | ⚠️ Limited |
| **Cost** | Free (local) | Free tier available |

## 🔄 Workflow Khuyến nghị

1. **Test locally với Docker**:
   ```bash
   yarn test:admin:docker
   ```

2. **Fix any errors** trong build log

3. **Verify app runs**:
   ```bash
   yarn docker:admin:up
   # Access http://localhost:3001
   ```

4. **Commit và push**:
   ```bash
   git add .
   git commit -m "fix: resolve build issues"
   git push origin dev
   ```

5. **Monitor Vercel deployment** - Should work now!

## 📝 Build Process

Docker build process giống Vercel:

1. **Stage 1: Dependencies**
   - Install all workspace dependencies
   - Copy package.json files
   - Run `yarn install`

2. **Stage 2: Builder**
   - Copy source code
   - Set environment variables
   - Run `turbo run build --filter=@rentalshop/admin`
   - Build all dependencies first, then admin app

3. **Stage 3: Runner**
   - Copy only production files
   - Set up Next.js server
   - Expose port 3001

## 🎯 Tips

1. **First build takes longer** - Subsequent builds use cache
2. **Use `--no-cache`** when debugging dependency issues
3. **Save logs** to file for detailed analysis
4. **Test with same env vars** as Vercel for consistency
5. **Clean up** old images: `docker system prune -a`

## 🚨 Common Issues

### Port already in use

```bash
# Check what's using port 3001
lsof -i :3001

# Kill process or change port in docker-compose.admin.yml
```

### Out of disk space

```bash
# Clean up Docker
docker system prune -a --volumes
```

### Build fails with permission errors

```bash
# Fix script permissions
chmod +x scripts/test-admin-docker.sh
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
