# Troubleshooting Guide

## Issue 1: Commands Not Found

**Error**: `error Command "db:generate" not found`

**Solution**:
1. Make sure you're in the correct directory:
   ```bash
   cd /Users/mac/Source-Code/rentalshop-nextjs/anyrent-new
   ```

2. Install dependencies first:
   ```bash
   yarn install
   ```

3. Then try the command again:
   ```bash
   yarn db:generate
   ```

## Issue 2: PostgreSQL Connection Error

**Error**: `FATAL: role "postgres" does not exist`

**Solution**: Find your PostgreSQL username

### Option A: Check existing PostgreSQL setup
```bash
# Check if PostgreSQL is running
pg_isready

# Check your username (usually your system username)
whoami

# Try connecting with your username
psql -U $(whoami) -d postgres
```

### Option B: Check Railway/Remote PostgreSQL
If you're using Railway or remote PostgreSQL, use the connection string from Railway dashboard.

### Option C: Create PostgreSQL user
```bash
# Connect as superuser (or use your system username)
psql -U $(whoami) postgres

# Create postgres user if needed
CREATE USER postgres WITH PASSWORD 'your_password';
ALTER USER postgres WITH SUPERUSER;
```

### Option D: Use your system username
Edit `.env.local`:
```bash
# Instead of postgres, use your actual username
MAIN_DATABASE_URL=postgresql://$(whoami):@localhost:5432/main_db
```

## Issue 3: Wrong Directory

**You're in**: `multiple tenancy/anyrent-new`  
**Should be**: `anyrent-new` (at root level)

**Fix**:
```bash
cd /Users/mac/Source-Code/rentalshop-nextjs/anyrent-new
```

## Issue 4: Database Doesn't Exist

**Error**: `database "main_db" does not exist`

**Solution**:
```bash
# Connect to PostgreSQL (use your username)
psql -U $(whoami) postgres

# Create database
CREATE DATABASE main_db;

# Exit
\q
```

## Quick Fix Script

Run this to check everything:

```bash
cd /Users/mac/Source-Code/rentalshop-nextjs/anyrent-new

# Check directory
pwd

# Find PostgreSQL username
echo "Your username: $(whoami)"
echo "Try: psql -U $(whoami) postgres"

# Check if dependencies installed
ls node_modules 2>/dev/null && echo "✅ Dependencies installed" || echo "❌ Run: yarn install"

# Check if .env.local exists
ls .env.local 2>/dev/null && echo "✅ .env.local exists" || echo "❌ Create .env.local"
```

## Step-by-Step Fix

1. **Navigate to correct directory**:
   ```bash
   cd /Users/mac/Source-Code/rentalshop-nextjs/anyrent-new
   ```

2. **Find your PostgreSQL username**:
   ```bash
   whoami
   # Use this username in .env.local
   ```

3. **Create .env.local**:
   ```bash
   cat > .env.local << EOF
   MAIN_DATABASE_URL=postgresql://$(whoami):@localhost:5432/main_db
   DATABASE_URL=postgresql://$(whoami):@localhost:5432/template_db
   NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
   NODE_ENV=development
   EOF
   ```

4. **Install dependencies**:
   ```bash
   yarn install
   ```

5. **Create database**:
   ```bash
   psql -U $(whoami) postgres -c "CREATE DATABASE main_db;"
   ```

6. **Run setup**:
   ```bash
   yarn setup
   ```

## Still Having Issues?

Check:
- ✅ PostgreSQL is installed and running: `pg_isready`
- ✅ You're in the correct directory: `pwd` should show `.../anyrent-new`
- ✅ Dependencies installed: `ls node_modules` should show folders
- ✅ .env.local exists: `cat .env.local`
- ✅ Database exists: `psql -U $(whoami) -l` (list databases)
