# 🔀 Git Workflow Guide: Dev → Main

Hướng dẫn workflow commit code lên dev branch, sau đó merge vào main với Railway deployment.

---

## 📋 Workflow Overview

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Local     │      │   Dev       │      │   Main      │
│   Changes   │─────▶│   Branch    │─────▶│   Branch    │
└─────────────┘      └─────────────┘      └─────────────┘
                            │                     │
                            ▼                     ▼
                      ┌─────────────┐      ┌─────────────┐
                      │  Railway    │      │  Railway     │
                      │  Dev Env    │      │  Production  │
                      └─────────────┘      └─────────────┘
                            │                     │
                            ▼                     ▼
                      ┌─────────────┐      ┌─────────────┐
                      │  Migration  │      │  Migration  │
                      │  Auto Run   │      │  Auto Run   │
                      └─────────────┘      └─────────────┘
```

---

## 🚀 Step-by-Step Workflow

### Step 1: Commit Changes to Dev Branch

```bash
# 1. Đảm bảo đang ở branch dev
git checkout dev
git status

# 2. Add files cần commit
git add prisma/schema.prisma
git add prisma/migrations/
git add packages/database/src/password-reset.ts
git add packages/utils/src/services/email.ts
git add apps/api/app/api/auth/forget-password/
git add apps/api/app/api/auth/reset-password/
git add apps/admin/app/forget-password/
git add apps/admin/app/reset-password/
git add packages/ui/src/components/forms/ResetPasswordForm.tsx
git add packages/ui/src/components/forms/index.ts
git add packages/utils/src/api/auth.ts
git add packages/utils/src/api/response-builder.ts
git add locales/en/auth.json
git add locales/vi/auth.json
git add package.json
git add scripts/migrate-database.sh
git add DATABASE_MIGRATION_GUIDE.md
git add RAILWAY_DATABASE_URL_GUIDE.md

# Hoặc add tất cả changes
git add .

# 3. Commit với message rõ ràng
git commit -m "feat: add password reset functionality for merchants

- Add PasswordReset database model
- Create password reset API endpoints
- Add forget password and reset password pages
- Create ResetPasswordForm component
- Add email templates for password reset
- Add translations for password reset flow
- Add migration guide and Railway DATABASE_URL guide"

# 4. Push lên origin/dev
git push origin dev
```

### Step 2: Test trên Dev Environment (Railway)

Sau khi push lên `dev` branch:

1. **Railway tự động deploy dev environment** (nếu có auto-deploy setup)
2. **Migration tự động chạy:**
   - Build time: trong Dockerfile
   - Runtime: trong start.sh
3. **Test functionality:**
   - Test forget password flow
   - Test reset password flow
   - Verify email sending

### Step 3: Merge Dev → Main

Sau khi test thành công trên dev:

```bash
# 1. Switch sang main branch
git checkout main

# 2. Pull latest changes từ main
git pull origin main

# 3. Merge dev vào main
git merge dev

# Hoặc dùng merge commit (khuyến nghị)
git merge dev --no-ff -m "Merge dev: Add password reset functionality"

# 4. Push lên origin/main
git push origin main
```

**Hoặc dùng Pull Request (Khuyến nghị):**

1. Tạo Pull Request trên GitHub:
   - Source: `dev`
   - Target: `main`
   - Review code
   - Merge PR

2. Railway tự động deploy production khi merge vào main

---

## 🔄 Railway Deployment Flow

### Dev Branch → Dev Environment

```bash
git push origin dev
```

**Railway tự động:**
1. ✅ Detect push to `dev` branch
2. ✅ Build Docker image
3. ✅ Inject DATABASE_URL (dev database)
4. ✅ Run migration: `prisma migrate deploy`
5. ✅ Deploy to dev environment
6. ✅ Start server

**Migration chạy trên:**
- Dev database (separate from production)
- Safe to test and break things

### Main Branch → Production Environment

```bash
git push origin main
# Hoặc merge PR vào main
```

**Railway tự động:**
1. ✅ Detect push to `main` branch
2. ✅ Build Docker image
3. ✅ Inject DATABASE_URL (production database)
4. ✅ Run migration: `prisma migrate deploy`
5. ✅ Deploy to production environment
6. ✅ Start server

**Migration chạy trên:**
- Production database
- ⚠️ **Be careful!** Test thoroughly on dev first

---

## 📝 Best Practices

### 1. Always Test on Dev First

```bash
# ✅ GOOD: Test migration on dev
git push origin dev
# → Railway deploys to dev
# → Migration runs on dev database
# → Test functionality
# → If OK, merge to main

# ❌ BAD: Push directly to main
git push origin main
# → Migration runs on production immediately
# → No testing opportunity
```

### 2. Commit Migration Files Together

```bash
# ✅ GOOD: Commit schema + migration together
git add prisma/schema.prisma
git add prisma/migrations/20251118131443_add_password_reset/
git commit -m "feat: add password reset migration"

# ❌ BAD: Commit schema without migration
git add prisma/schema.prisma
git commit -m "feat: add password reset"
# → Migration file missing → deployment fails
```

### 3. Use Descriptive Commit Messages

```bash
# ✅ GOOD: Clear commit message
git commit -m "feat: add password reset functionality for merchants

- Add PasswordReset database model
- Create password reset API endpoints
- Add forget password and reset password pages
- Add email templates and translations"

# ❌ BAD: Vague commit message
git commit -m "update"
```

### 4. Review Migration SQL Before Committing

```bash
# Always review migration SQL
cat prisma/migrations/20251118131443_add_password_reset/migration.sql

# Check for:
# - Correct table structure
# - Proper indexes
# - Foreign key constraints
# - No data loss
```

---

## 🎯 Current Changes Checklist

Dựa trên `git status`, đây là các files cần commit:

### Database & Migration
- [ ] `prisma/schema.prisma` (PasswordReset model)
- [ ] `prisma/migrations/20251118131443_add_password_reset/` (Migration file)
- [ ] `packages/database/src/password-reset.ts` (Database functions)
- [ ] `packages/database/src/index.ts` (Export password reset functions)

### API Endpoints
- [ ] `apps/api/app/api/auth/forget-password/route.ts` (Forget password endpoint)
- [ ] `apps/api/app/api/auth/reset-password/route.ts` (Reset password endpoint)

### Frontend Pages
- [ ] `apps/admin/app/forget-password/page.tsx` (Forget password page)
- [ ] `apps/admin/app/reset-password/page.tsx` (Reset password page)

### Components
- [ ] `packages/ui/src/components/forms/ResetPasswordForm.tsx` (Reset password form)
- [ ] `packages/ui/src/components/forms/index.ts` (Export ResetPasswordForm)

### Services & Utils
- [ ] `packages/utils/src/services/email.ts` (Password reset email template)
- [ ] `packages/utils/src/api/auth.ts` (Update resetPassword function)
- [ ] `packages/utils/src/api/response-builder.ts` (Add error codes)

### Translations
- [ ] `locales/en/auth.json` (English translations)
- [ ] `locales/vi/auth.json` (Vietnamese translations)

### Documentation & Scripts
- [ ] `DATABASE_MIGRATION_GUIDE.md` (Migration guide)
- [ ] `RAILWAY_DATABASE_URL_GUIDE.md` (Railway DATABASE_URL guide)
- [ ] `scripts/migrate-database.sh` (Migration script)
- [ ] `package.json` (Add migration scripts)

---

## 🚨 Important Notes

### Migration Timing

**Dev Environment:**
- Migration chạy ngay khi deploy dev
- Safe to test và break things
- Dev database separate from production

**Production Environment:**
- Migration chạy ngay khi deploy main
- ⚠️ **Be careful!** Test thoroughly first
- Production database - no rollback easy

### Database Separation

```
Dev Branch     → Dev Database (Railway Dev Environment)
Main Branch    → Production Database (Railway Production Environment)
```

**Lưu ý:**
- ✅ Dev và Production có database riêng
- ✅ Migration chạy trên database tương ứng
- ✅ Safe to test migration on dev first

---

## 📋 Quick Command Reference

### Commit to Dev

```bash
# 1. Check status
git status

# 2. Add all changes
git add .

# 3. Commit
git commit -m "feat: add password reset functionality"

# 4. Push to dev
git push origin dev
```

### Merge to Main

```bash
# Option 1: Direct merge
git checkout main
git pull origin main
git merge dev
git push origin main

# Option 2: Pull Request (Recommended)
# Create PR on GitHub: dev → main
# Review and merge
```

### Check Migration Status

```bash
# On Railway Dev
railway run --service dev-api yarn db:migrate:status

# On Railway Production
railway run --service prod-api yarn db:migrate:status
```

---

## ✅ Summary

**Workflow:**
1. ✅ Commit changes to `dev` branch
2. ✅ Push to `origin/dev`
3. ✅ Railway auto-deploys dev environment
4. ✅ Migration runs on dev database
5. ✅ Test functionality on dev
6. ✅ Merge `dev` → `main` (via PR or direct)
7. ✅ Railway auto-deploys production
8. ✅ Migration runs on production database

**Key Points:**
- ✅ Dev và Production có database riêng
- ✅ Migration tự động chạy khi deploy
- ✅ Test trên dev trước khi merge vào main
- ✅ Railway tự động inject DATABASE_URL

---

**Last Updated:** 2025-01-15

