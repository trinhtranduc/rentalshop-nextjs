# 🚀 Docker Quick Start Guide

## TL;DR - Quick Commands

```bash
# Start all services (PostgreSQL, Qdrant, API, Admin, Client)
yarn docker:dev:start

# Setup database (migrations, Prisma)
yarn docker:dev:setup-db

# View logs
yarn docker:dev:logs

# Stop services
yarn docker:dev:stop
```

## 📋 What Gets Started?

When you run `yarn docker:dev:start`, Docker will start:

1. **PostgreSQL** (port 5432) - Database
2. **Qdrant** (port 6333) - Vector database
3. **API Server** (port 3002) - Backend API
4. **Admin Dashboard** (port 3001) - Admin app
5. **Client App** (port 3000) - Customer-facing app

## 🎯 Common Workflows

### **Workflow 1: Full Docker Setup (Testing)**
```bash
# Start everything in Docker
yarn docker:dev:start

# Setup database
yarn docker:dev:setup-db

# Seed database (optional)
yarn db:regenerate-system

# Access apps
# - API: http://localhost:3002
# - Admin: http://localhost:3001
# - Client: http://localhost:3000
```

### **Workflow 2: Hybrid Setup (Recommended for Development)**
```bash
# Start only infrastructure (DB, Qdrant)
docker-compose -f docker-compose.dev.yml up -d postgres qdrant

# Run apps locally (faster, hot reload)
yarn dev:api      # Port 3002
yarn dev:admin    # Port 3001
yarn dev:client   # Port 3000
```

### **Workflow 3: Infrastructure Only**
```bash
# Start only PostgreSQL and Qdrant
docker-compose -f docker-compose.dev.yml up -d postgres qdrant

# Use remote database or local PostgreSQL
# Run apps with your preferred setup
```

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `yarn docker:dev:start` | Start all Docker services |
| `yarn docker:dev:stop` | Stop all Docker services |
| `yarn docker:dev:logs` | View logs for all services |
| `yarn docker:dev:rebuild` | Rebuild and restart services |
| `yarn docker:dev:clean` | Stop and remove volumes (⚠️ deletes data) |
| `yarn docker:dev:status` | Show service status and health |
| `yarn docker:dev:setup-db` | Setup database (Prisma + migrations) |

## 📝 View Logs for Specific Service

```bash
# View API logs
yarn docker:dev:logs api

# View Admin logs
yarn docker:dev:logs admin

# View PostgreSQL logs
yarn docker:dev:logs postgres

# View Qdrant logs
yarn docker:dev:logs qdrant
```

## 🐛 Troubleshooting

### **Port Already in Use**
```bash
# Check what's using the port
lsof -i :3002

# Kill the process
kill -9 <PID>
```

### **Database Connection Failed**
```bash
# Check PostgreSQL is running
yarn docker:dev:status

# Check PostgreSQL logs
yarn docker:dev:logs postgres

# Restart PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres
```

### **Services Won't Start**
```bash
# Rebuild everything
yarn docker:dev:rebuild

# Or clean and start fresh
yarn docker:dev:clean
yarn docker:dev:start
```

## 🔗 Access Services

After starting services:

- **API Server**: http://localhost:3002
- **Admin Dashboard**: http://localhost:3001
- **Client App**: http://localhost:3000
- **PostgreSQL**: `postgresql://postgres:postgres@localhost:5432/rentalshop_dev`
- **Qdrant**: http://localhost:6333

## 📚 More Information

- **Full Guide**: See [DOCKER_LOCAL_DEVELOPMENT.md](./DOCKER_LOCAL_DEVELOPMENT.md)
- **Railway vs Vercel**: Explained in full guide
- **Deployment**: See deployment documentation

## ✅ Next Steps

1. **Start services**: `yarn docker:dev:start`
2. **Setup database**: `yarn docker:dev:setup-db`
3. **Seed data** (optional): `yarn db:regenerate-system`
4. **Access apps**: Open http://localhost:3001 (Admin) or http://localhost:3000 (Client)
