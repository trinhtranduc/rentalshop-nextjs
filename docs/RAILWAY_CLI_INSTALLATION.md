# Railway CLI Installation Guide

## Cài Đặt Railway CLI

### Option 1: Homebrew (Recommended cho macOS)

```bash
# Cài Railway CLI bằng Homebrew
brew install railway

# Verify installation
railway --version
```

### Option 2: npm (Nếu có quyền)

```bash
# Cài Railway CLI bằng npm
npm install -g @railway/cli

# Verify installation
railway --version
```

### Option 3: Standalone Binary

```bash
# Download và cài binary
curl -fsSL https://railway.app/install.sh | sh

# Verify installation
railway --version
```

### Option 4: Manual Download

1. Truy cập: https://github.com/railwayapp/cli/releases
2. Download binary cho macOS
3. Extract và move vào PATH:
   ```bash
   sudo mv railway /usr/local/bin/
   chmod +x /usr/local/bin/railway
   ```

---

## Verify Installation

```bash
# Check version
railway --version

# Expected output:
# railway version X.X.X
```

---

## Login to Railway

Sau khi cài đặt, login vào Railway:

```bash
# Login
railway login

# Browser sẽ mở để authenticate
# Sau khi login thành công, bạn có thể sử dụng Railway CLI
```

---

## Verify Connection

```bash
# Check login status
railway whoami

# List projects
railway list

# Select project
railway link

# Or specify project ID
railway link --project <project-id>
```

---

## Common Commands

```bash
# Login
railway login

# Link to project
railway link

# Run command in Railway environment
railway run --service apis <command>

# View logs
railway logs --service apis -f

# Set environment variables
railway variables set QDRANT_URL=https://...

# View environment variables
railway variables

# Deploy
railway up
```

---

## Troubleshooting

### Permission Denied

**Error:** `EPERM: operation not permitted`

**Solution:**
- Dùng Homebrew: `brew install railway`
- Hoặc dùng sudo: `sudo npm install -g @railway/cli`
- Hoặc download binary và move vào PATH manually

### Command Not Found

**Error:** `railway: command not found`

**Solution:**
- Verify installation: `which railway`
- Check PATH: `echo $PATH`
- Add to PATH nếu cần

### Login Failed

**Error:** Login không thành công

**Solution:**
- Clear cache: `railway logout` rồi `railway login` lại
- Check network connection
- Try browser login: https://railway.app

---

## Next Steps After Installation

1. **Login:**
   ```bash
   railway login
   ```

2. **Link Project:**
   ```bash
   railway link
   ```

3. **Verify Setup:**
   ```bash
   railway run --service apis yarn verify:railway-setup
   ```

---

**Last Updated:** 2025-01-22
