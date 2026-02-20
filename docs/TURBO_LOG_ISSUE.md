# Turbo Log Output Issue - Repeated Prefixes

## 🐛 Vấn đề

Log output từ Turbo build bị lặp lại với pattern:
```
@rentalshop/admin:build: @rentalshop/admin:build: ...
```

## 📊 Phân tích Log

- **Total lines**: 6,763
- **Lines with prefix**: 6,338 (~94%)
- **Nested pattern**: `@rentalshop/admin:build: @rentalshop/admin:build:` xuất hiện nhiều lần

## 🔍 Nguyên nhân

1. **Turbo output prefixing**: Turbo tự động thêm prefix `@rentalshop/admin:build:` cho mọi output
2. **Nested builds**: Khi admin app build, nó gọi turbo build lại, tạo ra nested prefix
3. **Docker build context**: Trong Docker, mỗi RUN command có thể tạo thêm layer prefix

## 💡 Giải pháp

### Option 1: Disable Turbo Output Prefixing (Recommended)

Trong `turbo.json`, thêm:
```json
{
  "outputLogs": "new-only"
}
```

Hoặc trong build command:
```bash
turbo run build --filter=@rentalshop/admin --output-logs=new-only
```

### Option 2: Filter Log Output

Filter log để loại bỏ repeated prefixes:
```bash
docker-compose -f docker-compose.admin.yml build 2>&1 | \
  sed 's/@rentalshop\/admin:build: @rentalshop\/admin:build:/@rentalshop\/admin:build:/g' | \
  tee /tmp/admin-docker-build.log
```

### Option 3: Use Turbo's Quiet Mode

```bash
turbo run build --filter=@rentalshop/admin --quiet
```

### Option 4: Custom Log Formatting

Trong Dockerfile, thêm:
```dockerfile
RUN --mount=type=cache,target=/app/.turbo \
    SKIP_ENV_VALIDATION=true yarn turbo run build --filter=@rentalshop/admin \
    --output-logs=new-only 2>&1 | \
    sed 's/@rentalshop\/admin:build: //g'
```

## 📝 Impact

- **Log size**: Tăng ~2x do repeated prefixes
- **Readability**: Khó đọc do nested prefixes
- **Build time**: Không ảnh hưởng, chỉ là output formatting

## ✅ Recommended Fix

Update Dockerfile build command:
```dockerfile
RUN --mount=type=cache,target=/app/.turbo \
    SKIP_ENV_VALIDATION=true yarn turbo run build \
    --filter=@rentalshop/admin \
    --output-logs=new-only
```

Hoặc update `turbo.json`:
```json
{
  "pipeline": {
    "build": {
      "outputLogs": "new-only"
    }
  }
}
```

## 🔧 Quick Fix Script

```bash
# Filter log khi build
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build 2>&1 | \
  sed 's/@rentalshop\/admin:build: @rentalshop\/admin:build:/@rentalshop\/admin:build:/g' | \
  sed 's/@rentalshop\/admin:build: @rentalshop\/admin:build:/@rentalshop\/admin:build:/g' | \
  tee /tmp/admin-docker-build-clean.log
```
