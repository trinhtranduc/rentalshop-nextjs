# Docker Build Troubleshooting Guide

## 🐛 Common Errors & Solutions

### Error: "io: read/write on closed pipe"

**Cause:**
- Build log output quá lớn (>2MB)
- Docker daemon connection bị mất
- Pipe buffer bị đầy

**Solutions:**

1. **Restart Docker Desktop**:
   ```bash
   # Quit Docker Desktop và start lại
   # Hoặc
   docker restart
   ```

2. **Build với output giới hạn**:
   ```bash
   # Build và chỉ hiển thị errors/summary
   DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build 2>&1 | \
     grep -E "(ERROR|error|failed|Successfully|DONE)" | \
     tee /tmp/admin-docker-build-filtered.log
   ```

3. **Build không lưu log**:
   ```bash
   # Build trực tiếp không qua pipe
   DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build
   ```

4. **Build từng stage**:
   ```bash
   # Build chỉ dependencies stage
   DOCKER_BUILDKIT=1 docker build \
     --target deps \
     -f apps/admin/Dockerfile \
     -t rentalshop-admin:deps .
   ```

### Error: "Docker daemon not running"

**Solution:**
```bash
# Start Docker Desktop
# Hoặc trên Linux:
sudo systemctl start docker
```

### Error: "Build context too large"

**Solution:**
- Kiểm tra `.dockerignore` đã loại bỏ files không cần thiết
- Build từ thư mục gốc (đã có `.dockerignore`)

### Error: "Network timeout during yarn install"

**Solution:**
- Kiểm tra network connection
- Tăng timeout trong Dockerfile (đã set 600000ms = 10 phút)
- Retry tự động đã được cấu hình

## 🔧 Build Commands (Alternative)

### Option 1: Build với minimal output
```bash
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build 2>&1 | \
  grep -v "^#30" | \
  grep -E "(Building|DONE|ERROR|error|failed|Successfully)" | \
  tail -100
```

### Option 2: Build và save to file only
```bash
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build \
  > /tmp/admin-docker-build.log 2>&1

# Check result
tail -50 /tmp/admin-docker-build.log
```

### Option 3: Build với progress bar (quieter)
```bash
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build
```

### Option 4: Build từ Dockerfile trực tiếp
```bash
cd /Users/trinhtran/Documents/Source-Code/rentalshop-nextjs

DOCKER_BUILDKIT=1 docker build \
  -f apps/admin/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop \
  --build-arg NEXT_PUBLIC_APP_ENV=development \
  -t rentalshop-admin:latest .
```

## 📊 Check Build Status

### Check if build is running
```bash
docker ps
docker images | grep admin
```

### Check build logs
```bash
# View last 100 lines
tail -100 /tmp/admin-docker-build.log

# Search for errors
grep -i error /tmp/admin-docker-build.log

# Search for success
grep -i "success\|done" /tmp/admin-docker-build.log
```

### Check Docker system
```bash
# Docker info
docker info

# Docker version
docker version

# System disk usage
docker system df
```

## 🚀 Recommended Build Process

1. **Ensure Docker is running**:
   ```bash
   docker ps
   ```

2. **Clean previous builds** (optional):
   ```bash
   docker-compose -f docker-compose.admin.yml down
   docker system prune -f
   ```

3. **Build với minimal output**:
   ```bash
   DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build 2>&1 | \
     grep -E "(Building|DONE|ERROR|error|failed|Successfully)" | \
     tail -50
   ```

4. **Check result**:
   ```bash
   docker images | grep admin
   ```

## 💡 Tips

1. **First build takes longer** - Be patient (~10-12 min)
2. **Subsequent builds use cache** - Much faster (~3-5 min)
3. **Monitor disk space** - Docker images can be large
4. **Use BuildKit** - Always enable for cache mounts
5. **Check network** - Stable connection needed for yarn install

## 🆘 Still Having Issues?

1. **Restart Docker Desktop**
2. **Clear Docker cache**:
   ```bash
   docker builder prune -a
   ```
3. **Rebuild without cache**:
   ```bash
   docker-compose -f docker-compose.admin.yml build --no-cache
   ```
4. **Check Docker logs**:
   ```bash
   # macOS
   ~/Library/Containers/com.docker.docker/Data/log/host/Docker.log
   ```
