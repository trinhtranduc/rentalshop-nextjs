# Start All Servers - Quick Guide

## Option 1: Start All Servers với Turbo (Recommended)

```bash
# Từ root directory
cd anyrent-new

# Start tất cả servers cùng lúc
yarn dev:all

# Hoặc đơn giản
yarn dev
```

**Output**: Tất cả 3 servers sẽ chạy parallel:
- ✅ API server: http://localhost:3002
- ✅ Admin app: http://localhost:3000
- ✅ Client app: http://localhost:3001

**Stop**: Press `Ctrl+C` để stop tất cả

---

## Option 2: Start Từng Server Riêng

### Start All với Turbo (Parallel)

```bash
yarn dev:all
```

### Start Từng Server

```bash
# Start chỉ API
yarn dev:api

# Start chỉ Admin
yarn dev:admin

# Start chỉ Client
yarn dev:client
```

---

## Option 3: Manual Start (3 Terminals)

Nếu muốn control riêng từng server:

**Terminal 1 - API:**
```bash
cd apps/api
yarn dev
```

**Terminal 2 - Admin:**
```bash
cd apps/admin
yarn dev
```

**Terminal 3 - Client:**
```bash
cd apps/client
yarn dev
```

---

## Verify All Servers Running

```bash
# Check API
curl http://localhost:3002/api/tenant/info

# Check Admin
curl http://localhost:3000

# Check Client
curl http://localhost:3001

# Hoặc dùng test script
yarn test:client
```

---

## Troubleshooting

### Issue: Port Already in Use

**Error**: `Port 3000/3001/3002 is already in use`

**Fix**:
```bash
# Find process using port
lsof -i :3000
lsof -i :3001
lsof -i :3002

# Kill process
kill -9 <PID>

# Or change port in package.json
```

### Issue: Turbo Not Starting

**Fix**:
```bash
# Ensure turbo is installed
yarn install

# Check turbo.json exists
cat turbo.json
```

### Issue: Servers Start but Can't Access

**Check**:
1. Verify ports in package.json match URLs
2. Check firewall settings
3. Try accessing from browser
4. Check server logs in terminal

---

## Quick Commands Reference

```bash
# Start all
yarn dev:all

# Start specific
yarn dev:api       # API only
yarn dev:admin     # Admin only
yarn dev:client    # Client only

# Test setup
yarn verify

# Test client
yarn test:client

# Setup database
yarn setup
```

---

## Recommended Workflow

1. **First time setup**:
   ```bash
   yarn install
   yarn setup
   yarn verify
   ```

2. **Daily development**:
   ```bash
   yarn dev:all
   ```

3. **Test**:
   ```bash
   yarn test:client
   ```

4. **Stop**:
   - Press `Ctrl+C` in terminal running `yarn dev:all`

---

**Happy Coding!** 🚀
