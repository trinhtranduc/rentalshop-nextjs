# Railway Link Project Guide

## Link Project to Railway CLI

Sau khi đã login, bạn cần link project để có thể chạy commands.

---

## Cách 1: Link Project (Interactive)

```bash
# Link project (sẽ hiển thị danh sách projects)
railway link
```

**Steps:**
1. Chạy `railway link`
2. Chọn project từ danh sách
3. Project sẽ được link vào thư mục hiện tại

---

## Cách 2: Link Project by ID

Nếu bạn biết Project ID:

```bash
# Link bằng project ID
railway link --project <project-id>
```

**Tìm Project ID:**
1. Vào Railway dashboard: https://railway.app
2. Chọn project
3. Vào Settings → General
4. Copy Project ID

---

## Cách 3: Link Service

Nếu project có nhiều services, bạn có thể link service cụ thể:

```bash
# List services trong project
railway service

# Link service
railway link --service apis
```

---

## Verify Link

```bash
# Check linked project
railway status

# Expected output:
# Project: your-project-name
# Service: apis (if linked to service)
```

---

## Common Issues

### No Linked Project Found

**Error:** `No linked project found. Run railway link to connect to a project`

**Solution:**
```bash
# Link project
railway link

# Or link by project ID
railway link --project <project-id>
```

### Multiple Projects

**If you have multiple projects:**

```bash
# List all projects
railway list

# Link specific project
railway link --project <project-id>
```

### Service Not Found

**Error:** `Service 'apis' not found`

**Solution:**
```bash
# List services
railway service

# Link correct service
railway link --service <service-name>
```

---

## After Linking

Sau khi link thành công, bạn có thể:

```bash
# Run commands in Railway environment
railway run --service apis yarn verify:railway-setup

# View logs
railway logs --service apis -f

# Set environment variables
railway variables set QDRANT_URL=https://...

# View environment variables
railway variables
```

---

## Quick Reference

```bash
# Login
railway login

# Link project
railway link

# Verify link
railway status

# Run command
railway run --service apis <command>

# View logs
railway logs --service apis -f
```

---

**Last Updated:** 2025-01-22
