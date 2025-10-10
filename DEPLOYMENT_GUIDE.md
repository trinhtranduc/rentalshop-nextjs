# 🚀 Deployment Guide - Railway

Complete guide for deploying the Rental Shop Next.js monorepo to Railway.

## 📋 **Prerequisites**

Before deploying, make sure you have:

- ✅ Railway account created (https://railway.app)
- ✅ GitHub repository pushed
- ✅ Cloudinary account setup (optional - for image uploads)
- ✅ Local build successful (`yarn build`)

## 🎯 **Why Railway?**

| Feature | Railway | Other Platforms |
|---------|---------|----------------|
| **Database** | ✅ Built-in PostgreSQL | ❌ Need external ($25/mo) |
| **Backend** | ✅ Full Node.js support | ⚠️ Limited or serverless only |
| **Storage** | ✅ Persistent volumes | ❌ Need external |
| **Monorepo** | ✅ Native support | ⚠️ Complex setup |
| **Cost** | **$5-20/month** | $45+/month |
| **Setup** | ⚠️ 15 minutes | 1+ hours |

**Railway is perfect for full-stack monorepos with database!** 🚀

---

## 🚂 **Quick Railway Deploy**

### **Step 1: Install Railway CLI**

```bash
npm install -g @railway/cli
```

### **Step 2: Login**

```bash
railway login
```

### **Step 3: Create Project**

**Option A: From CLI**

```bash
# In your project directory
railway init

# Select "Create new project"
# Choose your workspace
```

**Option B: From Dashboard**

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Choose **"Empty Project"**
4. Name it (e.g., "rentalshop-nextjs")

### **Step 4: Connect GitHub Repository**

1. In Railway Dashboard, click your project
2. Click **"New"** → **"GitHub Repo"**
3. Select your repository
4. Railway will detect the monorepo structure automatically

### **Step 5: Add PostgreSQL Database**

```bash
# Via CLI
railway add postgresql

# Or via Dashboard:
# Click "New" → "Database" → "Add PostgreSQL"
```

### **Step 6: Configure Services**

Railway will auto-detect your services from Dockerfiles and `railway.json` files:

- ✅ **apis** - Backend API (port 3002)
- ✅ **admin** - Admin Dashboard (port 3001)
- ✅ **client** - Client App (port 3000)
- ✅ **postgres** - PostgreSQL Database

### **Step 7: Set Environment Variables**

**Automated Setup (Recommended):**

```bash
# Run the automated setup script
./scripts/setup-railway-env.sh
```

This script will:
1. Generate secure secrets (JWT_SECRET, NEXTAUTH_SECRET)
2. Set all environment variables for each service
3. Push Prisma schema to Railway database
4. Seed database with initial data

**Manual Setup:**

See [RAILWAY_ENV_SETUP.md](./RAILWAY_ENV_SETUP.md) for detailed manual setup instructions.

### **Step 8: Deploy**

```bash
# Push to GitHub to trigger deployment
git push

# Or deploy directly via CLI
railway up
```

### **Step 9: Monitor Deployment**

```bash
# View logs
railway logs --service apis

# Check status
railway status
```

---

## 📊 **Service Configuration**

### **API Service (apps/api)**

**Environment Variables:**

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-32-chars-min
JWT_EXPIRES_IN=1d
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min
NEXTAUTH_URL=https://apis-development.up.railway.app
API_URL=https://apis-development.up.railway.app
CLIENT_URL=https://client-development.up.railway.app
ADMIN_URL=https://admin-development.up.railway.app
CORS_ORIGINS=https://client-development.up.railway.app,https://admin-development.up.railway.app
```

**Build Configuration:**
- Dockerfile: `apps/api/Dockerfile`
- Start Command: `cd apps/api && yarn start`
- Health Check: `/api/health`

### **Admin Service (apps/admin)**

**Environment Variables:**

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://apis-development.up.railway.app
NEXTAUTH_SECRET=same-as-api-service
NEXTAUTH_URL=https://admin-development.up.railway.app
```

**Build Configuration:**
- Dockerfile: `apps/admin/Dockerfile`
- Start Command: `cd apps/admin && yarn start`
- Health Check: `/`

### **Client Service (apps/client)**

**Environment Variables:**

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://apis-development.up.railway.app
NEXTAUTH_SECRET=same-as-api-service
NEXTAUTH_URL=https://client-development.up.railway.app
```

**Build Configuration:**
- Dockerfile: `apps/client/Dockerfile`
- Start Command: `cd apps/client && yarn start`
- Health Check: `/`

---

## 🔑 **Default Login Credentials**

After database seeding:

### **👑 Super Admin (System-wide Access)**
- Email: `admin@rentalshop.com`
- Password: `admin123`
- **Access**: Full system access to all merchants and outlets

### **🏢 Merchant Accounts (Business Owners)**
- Merchant 1: `merchant1@example.com` / `merchant123`
- Merchant 2: `merchant2@example.com` / `merchant123`
- **Access**: Organization-wide access within their merchant

### **🏪 Outlet Admins (Outlet Managers)**
- Outlet 1: `admin.outlet1@example.com` / `admin123`
- Outlet 2: `admin.outlet2@example.com` / `admin123`
- Outlet 3: `admin.outlet3@example.com` / `admin123`
- Outlet 4: `admin.outlet4@example.com` / `admin123`
- **Access**: Full access to their assigned outlet

### **👥 Outlet Staff (Outlet Employees)**
- Outlet 1: `staff.outlet1@example.com` / `staff123`
- Outlet 2: `staff.outlet2@example.com` / `staff123`
- Outlet 3: `staff.outlet3@example.com` / `staff123`
- Outlet 4: `staff.outlet4@example.com` / `staff123`
- **Access**: Limited access to their assigned outlet

---

## 🔍 **Common Issues & Solutions**

### **Issue 1: DATABASE_URL not found**

**Symptoms:**
- API service fails to start
- Error: "DATABASE_URL is required"

**Solution:**
1. Make sure PostgreSQL database is added to Railway project
2. Use variable reference: `${{Postgres.DATABASE_URL}}`
3. Restart API service

### **Issue 2: Build timeout**

**Symptoms:**
- Build fails after 15-20 minutes
- Error: "Build exceeded maximum time"

**Solution:**
1. Check Dockerfile optimization
2. Use build cache properly
3. Contact Railway support to increase timeout

### **Issue 3: CORS errors**

**Symptoms:**
- Frontend can't connect to API
- Error: "CORS policy: No 'Access-Control-Allow-Origin'"

**Solution:**
1. Check `CORS_ORIGINS` includes all frontend URLs
2. Make sure URLs use `https://` (not `http://`)
3. No trailing slashes in URLs
4. Restart API service

### **Issue 4: Port binding issues**

**Symptoms:**
- Service fails to start
- Error: "Port already in use"

**Solution:**
1. Railway automatically assigns PORT variable
2. Make sure your app uses `process.env.PORT`
3. Don't hardcode ports in production

### **Issue 5: Memory limit exceeded**

**Symptoms:**
- Service crashes randomly
- Error: "Out of memory"

**Solution:**
1. Upgrade to higher plan ($10/mo → 2GB RAM)
2. Optimize your application
3. Check for memory leaks

---

## 📚 **Useful Commands**

### **Railway CLI**

```bash
# Check status
railway status

# View logs (follow mode)
railway logs --service apis -f

# View environment variables
railway variables --service apis

# Set environment variable
railway variables --set KEY=value --service apis

# Run command in Railway environment
railway run --service apis npx prisma studio

# Open service in browser
railway open --service apis

# Restart service
railway restart --service apis

# Delete service
railway service delete
```

### **Database Management**

```bash
# Open Prisma Studio
railway run --service apis npx prisma studio

# Push schema changes
railway run --service apis npx prisma db push

# Run migrations
railway run --service apis npx prisma migrate deploy

# Seed database
railway run --service apis yarn db:regenerate-system

# Reset database (DANGER!)
railway run --service apis npx prisma migrate reset
```

### **Debugging**

```bash
# Check build logs
railway logs --service apis --deployment <deployment-id>

# Check runtime logs
railway logs --service apis -f

# SSH into service (if available)
railway shell --service apis

# View service metrics
railway metrics --service apis
```

---

## 🎯 **Production Best Practices**

### **Security**

- ✅ Use strong secrets (32+ characters)
- ✅ Enable HTTPS only (Railway provides SSL)
- ✅ Set proper CORS origins
- ✅ Use environment variables for secrets
- ✅ Enable rate limiting
- ✅ Regular security audits

### **Performance**

- ✅ Enable caching (Redis if needed)
- ✅ Optimize Docker images
- ✅ Use CDN for static assets
- ✅ Monitor response times
- ✅ Optimize database queries

### **Monitoring**

- ✅ Set up error tracking (Sentry)
- ✅ Monitor service logs
- ✅ Track database usage
- ✅ Set up alerts for downtime
- ✅ Regular backups

### **Scaling**

- ✅ Start with basic plan ($5/mo)
- ✅ Monitor resource usage
- ✅ Upgrade as needed
- ✅ Consider horizontal scaling
- ✅ Use load balancer if needed

---

## 💰 **Cost Estimation**

### **Development Environment**

- **Basic Plan**: $5/month
  - 512MB RAM per service
  - 1GB storage
  - 100GB bandwidth
  - **Total**: ~$5-10/month (for all services)

### **Production Environment**

- **Pro Plan**: $20/month
  - 2GB RAM per service
  - 10GB storage
  - 1TB bandwidth
  - **Total**: ~$20-30/month (for all services)

### **Additional Costs**

- **Cloudinary** (Optional): Free tier (25GB storage)
- **Custom Domain**: Free on Railway
- **SSL Certificate**: Free on Railway

**Total Production Cost**: ~$20-30/month 🎉

---

## 📖 **Additional Resources**

- **Railway Documentation**: https://docs.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **Prisma Railway Guide**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway
- **Next.js Railway Template**: https://railway.app/template/next

---

## ✅ **Deployment Checklist**

Before going to production:

- [ ] All environment variables set
- [ ] Database migrated and seeded
- [ ] Services deployed and running
- [ ] Health checks passing
- [ ] CORS configured correctly
- [ ] SSL/HTTPS enabled
- [ ] Custom domains set up (optional)
- [ ] Error tracking enabled
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team access configured

---

## 🎉 **You're Done!**

Your Rental Shop application is now deployed on Railway! 🚀

**Next Steps:**
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure custom domains
4. Train your team
5. Launch! 🎉

For issues or questions, check:
- [RAILWAY_ENV_SETUP.md](./RAILWAY_ENV_SETUP.md) - Environment setup guide
- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) - Detailed deployment guide
- [RAILWAY_SIMPLE_GUIDE.md](./RAILWAY_SIMPLE_GUIDE.md) - Simplified guide

**Happy deploying!** 🚂✨
