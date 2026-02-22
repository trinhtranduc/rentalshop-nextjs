# 🐳 Docker Local Development Guide

## 📋 Tổng Quan

Hướng dẫn này giải thích cách sử dụng Docker cho **local development** trong khi vẫn có thể deploy lên **Vercel** (serverless) hoặc **Railway** (Docker support).

## 🔄 Railway vs Vercel: Sự Khác Biệt

### **Railway** (Hỗ trợ Docker)
- ✅ **Hỗ trợ Docker containers** - Deploy trực tiếp Dockerfile
- ✅ **Full control** - Chạy bất kỳ container nào
- ✅ **Persistent storage** - Volume mounts
- ✅ **Database included** - PostgreSQL, MySQL, Redis, etc.
- ✅ **Environment variables** - Quản lý qua Dashboard
- ✅ **Custom domains** - Tự động SSL
- 💰 **Pricing**: Pay-as-you-go

**Khi nào dùng Railway:**
- Cần Docker containers
- Cần persistent storage
- Cần full control over runtime
- Cần database services

### **Vercel** (Serverless - KHÔNG hỗ trợ Docker)
- ❌ **KHÔNG hỗ trợ Docker** - Chỉ serverless functions
- ✅ **Zero-config** - Tự động detect framework
- ✅ **Edge Network** - CDN global
- ✅ **Automatic scaling** - Serverless
- ✅ **Preview deployments** - Tự động cho mỗi PR
- ✅ **Analytics** - Built-in
- 💰 **Pricing**: Free tier generous, pay for usage

**Khi nào dùng Vercel:**
- Next.js apps (serverless)
- Static sites
- API routes (serverless functions)
- Không cần Docker

## 🎯 Chiến Lược Deployment

### **Option 1: Vercel (Recommended cho Next.js)**
```
┌─────────────┐
│   Vercel    │ ← Deploy Next.js apps (API, Admin, Client)
│ (Serverless)│
└─────────────┘
       │
       ▼
┌─────────────┐
│   Railway   │ ← Deploy PostgreSQL + Qdrant
│  (Docker)   │
└─────────────┘
```

**Ưu điểm:**
- ✅ Next.js apps chạy tốt trên Vercel (serverless)
- ✅ Edge network nhanh
- ✅ Preview deployments tự động
- ✅ Database trên Railway (Docker support)

### **Option 2: Railway (All-in-one)**
```
┌─────────────┐
│   Railway   │ ← Deploy tất cả (API, Admin, Client, DB, Qdrant)
│  (Docker)   │
└─────────────┘
```

**Ưu điểm:**
- ✅ Tất cả trong một platform
- ✅ Docker containers
- ✅ Persistent storage
- ✅ Database services

## 🚀 Local Development với Docker

### **Bước 1: Tạo Environment File**

Tạo file `.env.local` (hoặc copy từ `env.example`):

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rentalshop_dev

# JWT
JWT_SECRET=local-jwt-secret-key-minimum-32-characters-change-this
JWT_EXPIRES_IN=7d

# NextAuth
NEXTAUTH_SECRET=local-nextauth-secret-key-minimum-32-characters
NEXTAUTH_URL=http://localhost:3001

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3002
API_URL=http://localhost:3002
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Qdrant
QDRANT_URL=http://localhost:6333
```

### **Bước 2: Start Docker Services**

```bash
# Start tất cả services (PostgreSQL, Qdrant, API, Admin, Client)
docker-compose -f docker-compose.dev.yml up -d

# Xem logs
docker-compose -f docker-compose.dev.yml logs -f

# Xem logs của một service cụ thể
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f admin
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### **Bước 3: Setup Database**

```bash
# Generate Prisma Client
yarn db:generate

# Run migrations
yarn db:migrate:dev

# Seed database (optional)
yarn db:regenerate-system
```

### **Bước 4: Access Applications**

- **API Server**: http://localhost:3002
- **Admin Dashboard**: http://localhost:3001
- **Client App**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Qdrant**: http://localhost:6333

## 📝 Docker Commands

### **Start Services**
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Start specific service
docker-compose -f docker-compose.dev.yml up -d postgres
docker-compose -f docker-compose.dev.yml up -d qdrant
```

### **Stop Services**
```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (⚠️ deletes data)
docker-compose -f docker-compose.dev.yml down -v
```

### **View Logs**
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### **Rebuild Services**
```bash
# Rebuild all services
docker-compose -f docker-compose.dev.yml build

# Rebuild specific service
docker-compose -f docker-compose.dev.yml build api

# Rebuild and start
docker-compose -f docker-compose.dev.yml up -d --build
```

### **Execute Commands in Container**
```bash
# Run Prisma commands
docker-compose -f docker-compose.dev.yml exec api npx prisma migrate dev

# Access PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d rentalshop_dev

# Access API container shell
docker-compose -f docker-compose.dev.yml exec api sh
```

## 🔧 Development Workflow

### **Option A: Docker cho tất cả (Isolated)**
```bash
# Start all services in Docker
docker-compose -f docker-compose.dev.yml up -d

# Code changes require rebuild
docker-compose -f docker-compose.dev.yml up -d --build
```

**Ưu điểm:**
- ✅ Isolated environment
- ✅ Giống production (Railway)
- ✅ Không cần install dependencies locally

**Nhược điểm:**
- ❌ Chậm hơn (rebuild required)
- ❌ Không có hot reload

### **Option B: Hybrid (Recommended)**
```bash
# Start only infrastructure (PostgreSQL, Qdrant)
docker-compose -f docker-compose.dev.yml up -d postgres qdrant

# Run apps locally with yarn
yarn dev:api      # Port 3002
yarn dev:admin    # Port 3001
yarn dev:client   # Port 3000
```

**Ưu điểm:**
- ✅ Fast hot reload
- ✅ Quick development cycle
- ✅ Infrastructure isolated

**Nhược điểm:**
- ❌ Cần install dependencies locally

### **Option C: Local Development (No Docker)**
```bash
# Install PostgreSQL locally hoặc dùng Railway remote DB
# Run everything locally
yarn dev:all
```

**Ưu điểm:**
- ✅ Fastest development
- ✅ Full hot reload

**Nhược điểm:**
- ❌ Cần setup local PostgreSQL
- ❌ Environment khác production

## 🎯 Recommended Setup

### **Local Development (Daily)**
```bash
# Start infrastructure only
docker-compose -f docker-compose.dev.yml up -d postgres qdrant

# Run apps locally
yarn dev:all
```

### **Docker Testing (Before Deploy)**
```bash
# Test full Docker setup
docker-compose -f docker-compose.dev.yml up -d

# Verify all services
curl http://localhost:3002/api/health
curl http://localhost:3001
curl http://localhost:3000
```

## 📦 Deploy to Vercel

### **1. Connect Repository**
```bash
# Vercel CLI
vercel login
vercel link
```

### **2. Configure Environment Variables**
Trong Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=<railway-postgres-url>
JWT_SECRET=<your-jwt-secret>
NEXTAUTH_SECRET=<your-nextauth-secret>
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
```

### **3. Deploy**
```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploy)
git push origin main
```

## 📦 Deploy to Railway

### **1. Connect Repository**
- Railway Dashboard → New Project → Deploy from GitHub

### **2. Configure Services**
- **API Service**: Use `apps/api/Dockerfile`
- **Admin Service**: Use `apps/admin/Dockerfile`
- **Client Service**: Use `apps/client/Dockerfile`
- **PostgreSQL**: Add PostgreSQL service
- **Qdrant**: Add Qdrant service (or use Qdrant Cloud)

### **3. Set Environment Variables**
Railway Dashboard → Variables tab:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<your-jwt-secret>
NEXTAUTH_SECRET=<your-nextauth-secret>
NEXTAUTH_URL=https://your-app.railway.app
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
```

### **4. Deploy**
Railway tự động deploy khi push code lên GitHub.

## 🐛 Troubleshooting

### **Port Already in Use**
```bash
# Check what's using the port
lsof -i :3002

# Kill process
kill -9 <PID>

# Or change port in docker-compose.dev.yml
```

### **Database Connection Failed**
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps postgres

# Check logs
docker-compose -f docker-compose.dev.yml logs postgres

# Test connection
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d rentalshop_dev
```

### **Prisma Client Not Generated**
```bash
# Generate Prisma Client
docker-compose -f docker-compose.dev.yml exec api npx prisma generate

# Or locally
yarn db:generate
```

### **Volume Mount Issues**
```bash
# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache

# Remove volumes and recreate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)

## ✅ Summary

1. **Vercel**: Best cho Next.js apps (serverless), không hỗ trợ Docker
2. **Railway**: Best cho Docker containers, database services
3. **Local Docker**: Dùng cho testing, development, giống production
4. **Hybrid Approach**: Infrastructure (DB, Qdrant) trong Docker, apps chạy locally

**Recommended Workflow:**
- **Development**: Hybrid (Docker cho DB/Qdrant, local cho apps)
- **Testing**: Full Docker (giống production)
- **Production**: Vercel cho apps, Railway cho infrastructure
