# Quick Fix - MAIN_DATABASE_URL Error

## The Problem

You're seeing:
```
❌ Error: MAIN_DATABASE_URL environment variable is required
```

## The Solution

### Step 1: Install dotenv package

```bash
cd /Users/mac/Source-Code/rentalshop-nextjs/anyrent-new
yarn install
```

This installs the `dotenv` package needed to load `.env.local`.

### Step 2: Verify .env.local exists

```bash
ls -la .env.local
```

If it doesn't exist, create it:

```bash
# Get your username
USERNAME=$(whoami)
echo "Your PostgreSQL username: $USERNAME"

# Create .env.local
cat > .env.local << EOF
MAIN_DATABASE_URL=postgresql://${USERNAME}:@localhost:5432/main_db
DATABASE_URL=postgresql://${USERNAME}:@localhost:5432/template_db
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NODE_ENV=development
EOF
```

### Step 3: Run setup again

```bash
yarn setup
```

## Alternative: Manual Check

If it still doesn't work:

1. **Check .env.local content:**
   ```bash
   cat .env.local
   ```

2. **Verify MAIN_DATABASE_URL is set:**
   ```bash
   grep MAIN_DATABASE_URL .env.local
   ```

3. **Test loading manually:**
   ```bash
   source .env.local
   echo $MAIN_DATABASE_URL
   ```

4. **Run script with explicit env:**
   ```bash
   export $(cat .env.local | xargs) && yarn db:setup-main
   ```

## Common Issues

### Issue 1: Wrong username in connection string
**Fix**: Replace `mac` with your actual username:
```bash
whoami  # Shows your username
```

### Issue 2: .env.local not in root
**Fix**: Make sure it's in `anyrent-new/.env.local`, not in a subdirectory.

### Issue 3: Password required
**Fix**: If PostgreSQL requires password, add it:
```bash
MAIN_DATABASE_URL=postgresql://username:password@localhost:5432/main_db
```

## Success

After running `yarn setup`, you should see:
```
✅ Loaded .env.local using dotenv
🔌 Connecting to Main Database...
✅ Connected to Main Database
📋 Creating Merchant table...
✅ Merchant table created
...
🎉 Main Database setup completed successfully!
```
