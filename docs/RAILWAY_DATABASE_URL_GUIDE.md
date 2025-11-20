# 🔗 Railway DATABASE_URL Guide

Hướng dẫn về cách Railway xử lý DATABASE_URL và khi nào cần public URL.

---

## ✅ TL;DR: Không cần public URL khi deploy trên Railway

**Railway tự động:**
- ✅ Inject DATABASE_URL vào environment variables
- ✅ Chạy migration trong internal network
- ✅ Kết nối database tự động

**Chỉ cần public URL khi:**
- ⚠️ Testing migration từ local machine
- ⚠️ Debug từ local

---

## 🎯 Cách Railway Hoạt Động

### 1. Railway Tự Động Inject DATABASE_URL

Khi bạn add PostgreSQL service vào Railway project:

```bash
railway add postgresql
```

Railway tự động:
1. Tạo PostgreSQL service
2. Tạo DATABASE_URL environment variable
3. Inject vào tất cả services trong project

**Trong Railway Dashboard:**
```
Variables:
  DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

**Railway tự động resolve:**
- Internal URL: `postgresql://postgres:pass@postgres.railway.internal:5432/railway`
- Hoặc Public URL: `postgresql://postgres:pass@proxy.rlwy.net:port/railway`

---

## 🚀 Migration trên Railway (Không cần public URL)

### Automatic Migration

Migration tự động chạy khi deploy:

**1. Build Time (Dockerfile)**
```dockerfile
# Railway tự động inject DATABASE_URL
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma migrate deploy --schema=./prisma/schema.prisma
```

**2. Runtime (start.sh)**
```bash
# Railway tự động inject DATABASE_URL vào environment
npx prisma migrate deploy --schema=../../prisma/schema.prisma
```

**✅ Không cần làm gì thêm!**

### Manual Migration

```bash
# Railway tự động inject DATABASE_URL
railway run yarn railway:migrate

# Hoặc
railway run yarn db:migrate
```

**✅ Railway tự động:**
- Inject DATABASE_URL từ PostgreSQL service
- Chạy trong Railway network
- Kết nối database tự động

---

## 💻 Migration từ Local (Cần public URL)

### Khi nào cần public URL?

Chỉ khi bạn muốn **test migration từ local machine**:

```bash
# ❌ Sẽ fail nếu dùng internal URL
export DATABASE_URL="postgresql://postgres:pass@postgres.railway.internal:5432/railway"
yarn db:migrate
# Error: Can't reach database server

# ✅ Cần public URL
export DATABASE_URL="postgresql://postgres:pass@proxy.rlwy.net:46280/railway"
yarn db:migrate
# Success!
```

### Lấy Public URL từ Railway

**Option 1: Railway Dashboard**
1. Vào Railway Dashboard
2. Click vào PostgreSQL service
3. Click tab **"Connect"**
4. Copy **"Public Network"** URL

**Option 2: Railway CLI**
```bash
# Xem variables (sẽ show DATABASE_URL)
railway variables

# Hoặc xem từ PostgreSQL service
railway variables --service postgres
```

---

## 🔍 Kiểm Tra DATABASE_URL

### Trên Railway

```bash
# Check DATABASE_URL được inject
railway run echo $DATABASE_URL

# Check variables
railway variables

# Check từ specific service
railway variables --service api
```

### Từ Local

```bash
# Check local DATABASE_URL
echo $DATABASE_URL

# Test connection
npx prisma db pull --schema=./prisma/schema.prisma
```

---

## 📊 So Sánh: Internal vs Public URL

| Aspect | Internal URL | Public URL |
|--------|-------------|------------|
| **Format** | `railway.internal` | `proxy.rlwy.net` |
| **Access** | Railway network only | Internet accessible |
| **Security** | ✅ More secure | ⚠️ Less secure |
| **Migration trên Railway** | ✅ Tự động dùng | ❌ Không cần |
| **Migration từ local** | ❌ Không work | ✅ Cần dùng |

---

## 🎯 Best Practices

### ✅ Trên Railway (Production)

```bash
# 1. Deploy code
git push origin main

# 2. Railway tự động:
#    - Build Docker image
#    - Inject DATABASE_URL
#    - Run migration trong Dockerfile
#    - Deploy và start server
#    - Run migration backup trong start.sh

# ✅ Không cần làm gì thêm!
```

### ⚠️ Từ Local (Testing Only)

```bash
# 1. Lấy public URL từ Railway Dashboard
export DATABASE_URL="postgresql://postgres:pass@proxy.rlwy.net:port/railway"

# 2. Test migration
yarn db:migrate:dev

# 3. Verify
yarn db:migrate:status

# ⚠️ Chỉ dùng cho testing, không dùng cho production!
```

---

## 🐛 Troubleshooting

### Error: Can't reach database server

**Nếu chạy trên Railway:**
```bash
# 1. Check DATABASE_URL được inject
railway run echo $DATABASE_URL

# 2. Check PostgreSQL service được link
railway service list

# 3. Verify variable reference
railway variables | grep DATABASE_URL
# Should show: DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Nếu chạy từ local:**
```bash
# Cần public URL
export DATABASE_URL="postgresql://postgres:pass@proxy.rlwy.net:port/railway"

# Test connection
npx prisma db pull --schema=./prisma/schema.prisma
```

### Error: DATABASE_URL is not set

**Trên Railway:**
```bash
# 1. Check PostgreSQL service exists
railway service list

# 2. Add variable reference
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}'

# 3. Restart service
railway restart
```

---

## 📝 Summary

| Scenario | Cần Public URL? | DATABASE_URL Source |
|----------|----------------|---------------------|
| **Deploy trên Railway** | ❌ Không | Railway tự động inject |
| **Migration trên Railway** | ❌ Không | Railway tự động inject |
| **Test từ local** | ✅ Có | Manual set từ Railway Dashboard |
| **Debug từ local** | ✅ Có | Manual set từ Railway Dashboard |

---

## ✅ Checklist

Khi deploy migration:

- [ ] Code đã được commit và push
- [ ] Railway tự động deploy
- [ ] Migration chạy trong Dockerfile (build time)
- [ ] Migration chạy trong start.sh (runtime backup)
- [ ] Check logs: `railway logs --service api`
- [ ] Verify: `railway run yarn db:migrate:status`

**✅ Không cần set DATABASE_URL manual!**

---

**Last Updated:** 2025-01-15

