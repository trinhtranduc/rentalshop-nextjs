# 🚀 Migration Next Steps - Sau khi push vào Dev

Hướng dẫn các bước tiếp theo sau khi đã commit và push vào dev branch.

---

## ✅ Bạn đã hoàn thành:

- [x] Commit code vào dev branch
- [x] Push lên origin/dev

---

## 🎯 Bước tiếp theo: Railway tự động deploy

### Railway tự động làm gì:

1. **Detect push to dev branch**
   - Railway detect code changes
   - Trigger build process

2. **Build Docker image**
   - Build từ Dockerfile
   - Install dependencies
   - Build Next.js app

3. **Inject DATABASE_URL tự động** ⚡
   ```
   Railway tự động inject:
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   → Không cần export manual!
   → Railway tự động làm điều này
   ```

4. **Run migration tự động**
   - Build time: Trong Dockerfile
   - Runtime: Trong start.sh (backup)

5. **Deploy to dev environment**
   - Start server
   - Health check

---

## 🔍 Cách Verify Migration đã chạy

### Option 1: Railway Dashboard (Khuyến nghị)

1. **Vào Railway Dashboard:**
   - https://railway.app
   - Login vào project

2. **Check Deployment:**
   - Vào service (API service)
   - Xem tab **"Deployments"**
   - Tìm deployment mới nhất
   - Check build logs

3. **Check Build Logs:**
   ```
   Tìm trong logs:
   ✅ "Running database migrations..."
   ✅ "Migration completed successfully"
   ✅ "Database migrations status:"
   ```

4. **Check Runtime Logs:**
   - Tab **"Logs"**
   - Tìm: `📦 Running database migrations...`
   - Verify: `✅ Database setup completed`

### Option 2: Railway CLI

```bash
# 1. Login Railway (nếu chưa)
railway login

# 2. Link project (nếu chưa)
railway link

# 3. Check deployment status
railway status

# 4. Check logs
railway logs --service api --tail 100

# 5. Check migration status
railway run yarn db:migrate:status

# 6. Verify DATABASE_URL được inject
railway run echo $DATABASE_URL
```

### Option 3: Check Database Schema

```bash
# Connect to dev database và check table
railway run npx prisma db pull --schema=./prisma/schema.prisma

# Hoặc check migration history
railway run npx prisma migrate status --schema=./prisma/schema.prisma
```

---

## ⚠️ Lưu ý quan trọng về DATABASE_URL

### Railway tự động inject - KHÔNG cần export!

**Trên Railway:**
```bash
# ❌ KHÔNG CẦN làm điều này:
export DATABASE_URL="postgresql://..."
# Railway tự động inject rồi!

# ✅ Railway tự động làm:
# - Inject DATABASE_URL vào container environment
# - Migration tự động sử dụng DATABASE_URL này
# - Không cần config thêm
```

**Cách Railway inject:**

1. **Trong Railway Dashboard:**
   ```
   Variables:
     DATABASE_URL = ${{Postgres.DATABASE_URL}}
   ```
   Railway tự động resolve `${{Postgres.DATABASE_URL}}` thành actual URL

2. **Trong Dockerfile:**
   ```dockerfile
   ARG DATABASE_URL        # Railway inject vào đây
   ENV DATABASE_URL=${DATABASE_URL}  # Set environment variable
   RUN npx prisma migrate deploy  # Sử dụng DATABASE_URL tự động
   ```

3. **Trong start.sh:**
   ```bash
   # DATABASE_URL đã có sẵn trong environment
   npx prisma migrate deploy  # Tự động sử dụng DATABASE_URL
   ```

---

## 🧪 Test Migration trên Dev

Sau khi Railway deploy xong:

### 1. Test Forget Password Flow

```bash
# Test API endpoint
curl -X POST https://your-dev-api.railway.app/api/auth/forget-password \
  -H "Content-Type: application/json" \
  -d '{"email": "merchant1@example.com"}'

# Expected response:
# {
#   "success": true,
#   "code": "PASSWORD_RESET_LINK_SENT",
#   "message": "Nếu email tồn tại trong hệ thống..."
# }
```

### 2. Check Email (Console Mode)

Nếu `EMAIL_PROVIDER=console`, check Railway logs:
```bash
railway logs --service api | grep "EMAIL"
```

### 3. Test Reset Password Page

- Vào: `https://your-dev-admin.railway.app/forget-password`
- Nhập email merchant
- Check email (hoặc logs) để lấy reset token
- Vào: `https://your-dev-admin.railway.app/reset-password?token=xxx`
- Test reset password flow

### 4. Verify Database

```bash
# Check PasswordReset table exists
railway run npx prisma studio --schema=./prisma/schema.prisma

# Hoặc check via SQL
railway run psql $DATABASE_URL -c "\d \"PasswordReset\""
```

---

## ✅ Checklist: Verify Migration Success

- [ ] Railway deployment thành công
- [ ] Build logs show migration ran
- [ ] Runtime logs show migration completed
- [ ] `railway run yarn db:migrate:status` shows all migrations applied
- [ ] PasswordReset table exists in database
- [ ] Forget password API works
- [ ] Reset password page loads
- [ ] Email sending works (check logs)

---

## 🐛 Troubleshooting

### Migration không chạy?

**Check 1: DATABASE_URL được inject chưa?**
```bash
railway run echo $DATABASE_URL
# Should show: postgresql://postgres:...@...
```

**Check 2: PostgreSQL service được link chưa?**
```bash
railway service list
# Should show PostgreSQL service
```

**Check 3: Variable reference đúng chưa?**
```bash
railway variables | grep DATABASE_URL
# Should show: DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Fix: Set variable reference**
```bash
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}'
railway restart
```

### Migration failed?

**Check logs:**
```bash
railway logs --service api --tail 200 | grep -i migration
```

**Common issues:**
- Migration file syntax error → Check migration SQL
- Database connection failed → Check DATABASE_URL
- Table already exists → Migration already applied (OK)

### Manual migration (nếu cần)

```bash
# Chạy migration manual
railway run yarn railway:migrate

# Check status
railway run yarn db:migrate:status
```

---

## 🎯 Sau khi Migration thành công trên Dev

### Bước tiếp theo: Merge vào Main

```bash
# 1. Switch sang main
git checkout main

# 2. Pull latest
git pull origin main

# 3. Merge dev
git merge dev --no-ff -m "Merge dev: Add password reset functionality"

# 4. Push main
git push origin main

# 5. Railway tự động deploy production
#    → Migration tự động chạy trên production database
```

---

## 📊 Timeline

```
┌─────────────────────────────────────────────────────────┐
│ 1. git push origin dev                                  │
│    ↓                                                     │
│ 2. Railway detect push                                  │
│    ↓                                                     │
│ 3. Build Docker image                                    │
│    ↓                                                     │
│ 4. Railway inject DATABASE_URL (tự động)                │
│    ↓                                                     │
│ 5. Run migration trong Dockerfile                        │
│    ↓                                                     │
│ 6. Deploy to dev environment                             │
│    ↓                                                     │
│ 7. Run migration trong start.sh (backup)                │
│    ↓                                                     │
│ 8. Server start                                          │
│    ↓                                                     │
│ 9. Test functionality                                    │
│    ↓                                                     │
│ 10. Merge dev → main                                     │
│    ↓                                                     │
│ 11. Railway deploy production                            │
│    ↓                                                     │
│ 12. Migration chạy trên production database              │
└─────────────────────────────────────────────────────────┘
```

---

## 🎉 Summary

**Sau khi push vào dev:**

1. ✅ **Railway tự động deploy** (không cần làm gì)
2. ✅ **Railway tự động inject DATABASE_URL** (không cần export)
3. ✅ **Migration tự động chạy** (build time + runtime)
4. ✅ **Verify migration thành công** (check logs/status)
5. ✅ **Test functionality** (forget password flow)
6. ✅ **Merge vào main** (khi test OK)

**Key Point:**
- ⚡ Railway tự động làm mọi thứ
- ⚡ Không cần export DATABASE_URL
- ⚡ Migration tự động chạy
- ⚡ Chỉ cần verify và test!

---

**Last Updated:** 2025-01-15

