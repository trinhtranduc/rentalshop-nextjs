# 🚀 Quick Deployment Reference

## ⚡ **Super Quick Start** (5 phút)

```bash
# 1. Setup
git clone <repo> && cd rentalshop-nextjs
yarn install

# 2. Environment
cp .env .env.local
# (Already configured - no editing needed!)

# 3. Database
yarn db:regenerate-system

# 4. Test
yarn dev:all

# 5. Deploy
vercel --prod
```

---

## 🌍 **Environment Files**

```
Current Setup (Standardized):
✅ .env                    # Development defaults (COMMITTED)
✅ .env.production         # Production template (COMMITTED)  
✅ env.example             # Documentation (COMMITTED)
✅ .env.local              # Personal overrides (GIT IGNORED)
❌ apps/*/.env             # DELETED (use root .env)
```

---

## 🔑 **Critical Environment Variables**

### **Development (Already Set)**
```bash
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="local-jwt-secret-DO-NOT-USE-IN-PRODUCTION"
```

### **Production (Must Set in Vercel)**
```bash
# Generate secrets:
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

# Set in Vercel:
DATABASE_URL="postgresql://user:pass@host/db"
JWT_SECRET="<generated-secret>"
NEXTAUTH_SECRET="<generated-secret>"
CLIENT_URL="https://rentalshop.com"
API_URL="https://api.rentalshop.com"
```

---

## 📦 **Vercel Projects Setup**

```
Create 3 Vercel Projects:

1. rentalshop-api      → apps/api      → api.rentalshop.com
2. rentalshop-client   → apps/client   → rentalshop.com
3. rentalshop-admin    → apps/admin    → admin.rentalshop.com
```

---

## 🗄️ **Database Options**

### **Quick Compare:**

| Provider | Best For | Free Tier | Setup Time |
|----------|----------|-----------|------------|
| **Neon** | Production | 10GB | 2 min ⚡ |
| **Supabase** | All-in-one | 500MB | 3 min |
| **Vercel Postgres** | Vercel users | 256MB | 1 min ⚡⚡ |

### **Recommended: Neon**

```bash
# 1. Create account: https://neon.tech
# 2. Create project: "rentalshop"
# 3. Copy connection string
# 4. Set in Vercel:
vercel env add DATABASE_URL production
# Paste: postgresql://user:pass@host.neon.tech/rentalshop
```

---

## 🚀 **Deploy Commands**

```bash
# Preview deployment (test first!)
vercel

# Production deployment
vercel --prod

# Deploy with env refresh
vercel env pull && vercel --prod

# Force rebuild
vercel --prod --force
```

---

## ✅ **Deployment Checklist**

```
Before deploying:
☐ yarn build (local test)
☐ All tests passing
☐ Database migrated
☐ Env vars set in Vercel
☐ Domains configured

After deploying:
☐ Health check: curl https://api.rentalshop.com/api/health
☐ Test login
☐ Test critical flows
☐ Monitor errors (Sentry)
```

---

## 🆘 **Common Issues**

| Error | Solution |
|-------|----------|
| `DATABASE_URL not found` | Set in Vercel: `vercel env add DATABASE_URL production` |
| `Prisma client not initialized` | Add `postinstall: prisma generate` to package.json |
| `CORS blocked` | Update `CORS_ORIGINS` in Vercel env vars |
| `Can't connect to database` | Check `DATABASE_URL` format includes `?sslmode=require` |
| `Migration failed` | Run manually: `npx prisma migrate deploy` |

---

## 📞 **Quick Links**

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech/
- **Prisma Studio**: `npx prisma studio`
- **Full Guide**: See `DEPLOYMENT_GUIDE.md`

---

## 🎯 **Current Status**

```
✅ Environment: Standardized (single .env at root)
✅ Database: SQLite (dev), ready for PostgreSQL (prod)
✅ Apps: 3 apps ready to deploy
✅ Secrets: Development keys set
⏳ Production: Awaiting Vercel setup
```

**Next Action:** Create Vercel account and set production environment variables! 🚀

