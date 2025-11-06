# Setup Instructions - Do This Now

## ✅ Quick Fix for Your Current Issues

Based on your terminal output, here's what to do:

### Step 1: Navigate to Correct Directory

```bash
# You were in: multiple tenancy/anyrent-new
# Should be: anyrent-new (root level)

cd /Users/mac/Source-Code/rentalshop-nextjs/anyrent-new
```

### Step 2: Find Your PostgreSQL Username

```bash
whoami
# Output will be your username (probably "mac")
# Use this instead of "postgres"
```

### Step 3: Install Dependencies First!

```bash
# This is why commands weren't found - dependencies not installed yet
yarn install
```

### Step 4: Create .env.local with Your Username

```bash
# Replace "mac" with your actual username from Step 2
cat > .env.local << 'EOF'
MAIN_DATABASE_URL=postgresql://mac:@localhost:5432/main_db
DATABASE_URL=postgresql://mac:@localhost:5432/template_db
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NODE_ENV=development
EOF
```

**Or edit manually:**
```bash
nano .env.local
# Or
code .env.local
```

### Step 5: Create Main Database

```bash
# Use your username (not "postgres")
psql -U mac postgres -c "CREATE DATABASE main_db;"
```

If that doesn't work, try:
```bash
psql postgres -c "CREATE DATABASE main_db;"
```

### Step 6: Run Setup

```bash
# This will create tables and generate Prisma client
yarn setup
```

If `yarn setup` fails, run separately:
```bash
yarn db:setup-main
yarn db:generate
```

## 🔧 Alternative: Manual Setup

If the above doesn't work, do it manually:

```bash
# 1. Install
yarn install

# 2. Create database
createdb main_db

# 3. Run setup script directly
node scripts/setup-main-db.js

# 4. Generate Prisma
yarn db:generate
```

## ❌ Common Errors & Fixes

### Error: "Command not found"
**Fix**: Run `yarn install` first!

### Error: "role postgres does not exist"
**Fix**: Use your system username instead of "postgres"
- Find it: `whoami`
- Use in connection string: `postgresql://YOUR_USERNAME:@localhost:5432/main_db`

### Error: "database main_db does not exist"
**Fix**: Create it manually:
```bash
createdb main_db
# Or
psql -U YOUR_USERNAME postgres -c "CREATE DATABASE main_db;"
```

### Error: "Cannot cd to anyrent-new"
**Fix**: Check your current location:
```bash
pwd
# If you're in wrong place:
cd /Users/mac/Source-Code/rentalshop-nextjs/anyrent-new
```

## ✅ Success Checklist

After running setup, verify:

- [ ] `yarn install` completed successfully
- [ ] `.env.local` exists with correct username
- [ ] Database `main_db` exists (check: `psql -l`)
- [ ] `yarn db:setup-main` created tables
- [ ] `yarn db:generate` created Prisma client
- [ ] Can see `node_modules/.prisma/client` directory

## 🚀 After Setup Complete

Then start servers (3 terminals):

```bash
# Terminal 1
cd apps/api && yarn dev

# Terminal 2  
cd apps/admin && yarn dev

# Terminal 3
cd apps/client && yarn dev
```

Visit: http://localhost:3000

---

**Still stuck?** Check `TROUBLESHOOTING.md` for more detailed help.
