# Next Steps - Testing the Multi-Tenant Demo

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL running locally or connection string ready
- ✅ Yarn package manager installed

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd anyrent-new
yarn install
```

### 2. Configure Environment Variables

Create `.env.local` file in the root:

```bash
# Main Database (PostgreSQL) - This stores tenant metadata
MAIN_DATABASE_URL=postgresql://postgres:password@localhost:5432/main_db

# Tenant Database Template (will be overridden per tenant)
DATABASE_URL=postgresql://postgres:password@localhost:5432/template_db

# Domain Configuration
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NODE_ENV=development
```

**Important**: Replace the connection string with your actual PostgreSQL credentials.

### 3. Create Main Database

Connect to PostgreSQL and create the database:

```bash
psql -U postgres

# Then in psql:
CREATE DATABASE main_db;
\q
```

### 4. Setup Main Database Tables

Run the setup script to create tables:

```bash
yarn db:setup-main
```

Or run everything at once:

```bash
yarn setup
```

This will:
- Create `Merchant` table
- Create `Tenant` table  
- Create necessary indexes

### 5. Generate Prisma Client

Generate Prisma client for Tenant DB schema (this is the ONLY Prisma generation):

```bash
yarn db:generate
```

**Expected output**: Prisma client generated successfully in `node_modules/.prisma/client`

### 6. Start Development Servers

Open 3 terminal windows:

**Terminal 1 - API Server:**
```bash
cd anyrent-new/apps/api
yarn dev
```
Server will run on: http://localhost:3002

**Terminal 2 - Admin App:**
```bash
cd anyrent-new/apps/admin
yarn dev
```
Server will run on: http://localhost:3000

**Terminal 3 - Client App:**
```bash
cd anyrent-new/apps/client
yarn dev
```
Server will run on: http://localhost:3001

### 7. Test Registration Flow

1. **Open Admin App**: http://localhost:3000
2. **Fill Registration Form**:
   - Business Name: "My Shop"
   - Email: "shop@example.com"
   - Phone: (optional)
   - Subdomain: (leave empty to auto-generate)
3. **Click "Create Shop"**
4. **Wait for Database Creation** (may take 10-20 seconds):
   - Creates merchant in Main DB
   - Creates new PostgreSQL database for tenant
   - Runs Prisma migrations on tenant DB
   - Creates tenant record in Main DB
5. **Success!** You'll be redirected to your tenant subdomain

### 8. Access Tenant Dashboard

After registration, you'll see a redirect URL like:
- `http://myshop.localhost:3000`

**To make localhost subdomains work:**

**Option A: Edit hosts file**

Mac/Linux:
```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1 myshop.localhost
127.0.0.1 shop2.localhost
```

Windows:
```
C:\Windows\System32\drivers\etc\hosts
```

Add same entries.

**Option B: Use proxy tool** (easier for development)

```bash
npm install -g local-ssl-proxy
local-ssl-proxy 3001 3001 --cert localhost.pem --key localhost-key.pem
```

### 9. Verify Data Isolation

1. **Create Second Tenant**:
   - Go back to http://localhost:3000
   - Create another shop (e.g., "Shop 2")

2. **Check Database Isolation**:
   - Access `myshop.localhost:3000` → See Shop 1's data
   - Access `shop2.localhost:3000` → See Shop 2's data
   - Data is completely isolated!

3. **Verify in PostgreSQL**:
   ```bash
   psql -U postgres
   
   # List databases
   \l
   
   # You should see:
   # main_db (Main DB)
   # myshop_db (Tenant 1)
   # shop2_db (Tenant 2)
   ```

### 10. Test API Endpoints

**Get Tenant Info:**
```bash
curl -H "x-tenant-subdomain: myshop" http://localhost:3002/api/tenant/info
```

**Get Products (empty initially):**
```bash
curl -H "x-tenant-subdomain: myshop" http://localhost:3002/api/products
```

**Create Product:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: myshop" \
  -d '{"name":"Product 1","description":"Test product","price":99.99,"stock":10}' \
  http://localhost:3002/api/products
```

## Troubleshooting

### Prisma Generation Errors

**Error**: Multiple Prisma clients conflict

**Solution**:
- Ensure `prisma/main/schema.prisma` has NO `generator` block
- Only `prisma/schema.prisma` should have generator
- Delete `node_modules/.prisma` and run `yarn db:generate` again

### Database Connection Errors

**Error**: Cannot connect to Main DB

**Solution**:
- Check `MAIN_DATABASE_URL` in `.env.local`
- Verify PostgreSQL is running: `pg_isready`
- Ensure database exists: `CREATE DATABASE main_db;`

### Tenant Database Creation Fails

**Error**: Permission denied or database already exists

**Solution**:
- Check PostgreSQL user has `CREATE DATABASE` permission
- Check if database name conflicts (script drops existing)
- Verify disk space on database server

### Subdomain Not Working

**Error**: `myshop.localhost:3000` doesn't load

**Solution**:
- Add to `/etc/hosts` (see Step 8)
- Verify middleware is running
- Check browser console for errors
- Try accessing via API directly with header

## What's Working

After completing setup, you should have:

✅ **Main Database** - Stores tenant metadata (Raw SQL)
✅ **Tenant Databases** - Isolated databases per tenant (Prisma)
✅ **Registration Flow** - Create tenant → Create DB → Redirect
✅ **Subdomain Routing** - Automatic tenant detection
✅ **Data Isolation** - Complete separation between tenants
✅ **No Prisma Conflicts** - Main DB uses Raw SQL only

## Next Features to Add

Once basic POC is working:

1. **Authentication** - JWT tokens for secure access
2. **More API Endpoints** - Orders, Customers, Payments
3. **Admin Features** - Deactivate tenants, view stats
4. **Product Management** - Full CRUD in tenant dashboard
5. **Better UI** - Tailwind CSS styling
6. **Error Handling** - Better error messages and validation

## Success Checklist

- [ ] Dependencies installed
- [ ] Main DB tables created
- [ ] Prisma client generated
- [ ] All 3 servers running
- [ ] First tenant created successfully
- [ ] Can access tenant subdomain
- [ ] Data isolation verified
- [ ] API endpoints working

## Need Help?

If you encounter issues:

1. Check error logs in terminal
2. Verify environment variables
3. Test database connection manually
4. Review README.md troubleshooting section
5. Check Prisma schema files (ensure only one has generator)

Happy coding! 🚀
