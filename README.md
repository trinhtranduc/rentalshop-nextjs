# 🏪 Rental Shop Next.js Monorepo

A comprehensive rental shop management system built with Next.js, featuring a multi-tenant architecture with Super Admin → Merchant → Outlet → Staff hierarchy.

## 🏗️ Architecture

```
Super Admin (System Admin)
├── Manages entire system
├── Can create/manage merchants
└── Has full access to all data

Merchants (Business Owners)
├── Each merchant has 1 owner account
├── Can have multiple outlets
├── Manages their business operations
└── Can create outlet managers and staff

Outlets (Physical Locations)
├── Each outlet belongs to 1 merchant
├── Has outlet manager and staff
├── Contains products for rental
└── Handles local operations

Outlet Staff
├── Outlet Manager: Manages specific outlet
└── Outlet Staff: Handles daily operations
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Yarn** package manager
- **Git**

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd rentalshop-nextjs

# Install dependencies
yarn install
```

### Step 2: Environment Configuration

```bash
# Copy environment template
cp env.example .env.local

# Edit environment variables (optional for local development)
# The default local environment uses SQLite and doesn't require external services
```

### Step 3: Database Setup (Local Development)

```bash
# One-command database setup (recommended)
./scripts/setup-database.sh

# Or manually:
# Generate Prisma client
yarn db:generate

# Push schema to SQLite database
yarn db:push

# Seed with sample data
yarn db:seed
```

### Step 4: Start Development Server

```bash
# Start all applications (recommended)
yarn dev:all

# Or start individual apps:
# Client app only
cd apps/client && yarn dev

# Admin app only  
cd apps/admin && yarn dev

# API app only
cd apps/api && yarn dev
```

## 🌐 Application URLs

Once started, your applications will be available at:

- **Client App (Shop Owner Portal)**: http://localhost:3000
- **Admin App (Admin Panel)**: http://localhost:3001
- **API Server**: http://localhost:3002

## 🔐 Seeded Login Accounts

After running the seed (yarn db:seed), these accounts are available:

### **🌐 Application Access**

| Application | URL | Purpose |
|-------------|-----|---------|
| **Client App** | http://localhost:3000 | Customer-facing rental interface |
| **Admin App** | http://localhost:3001 | Super admin dashboard |
| **API Server** | http://localhost:3002 | Backend API & Documentation |

### 👥 Merchant 1 — Rental Shop Demo
- Merchant owner: `merchant@rentalshop.com` / `password123`
- Outlet admin (Main): `outlet_admin_main@rentalshop.com` / `password123`
- Outlet staff (Main): `outlet_staff_main@rentalshop.com` / `password123`
- Outlet admin (Downtown): `outlet_admin_downtown@rentalshop.com` / `password123`
- Outlet staff (Downtown): `outlet_staff_downtown@rentalshop.com` / `password123`

### 👥 Merchant 2 — Outdoor Equipment Co.
- Merchant owner: `merchant@outdoor.com` / `password123`
- Outlet admin (Beach): `outlet_admin_beach@outdoor.com` / `password123`
- Outlet staff (Beach): `outlet_staff_beach@outdoor.com` / `password123`
- Outlet admin (Mountain): `outlet_admin_mountain@outdoor.com` / `password123`
- Outlet staff (Mountain): `outlet_staff_mountain@outdoor.com` / `password123`

All of the above users are created by the seed with roles aligned to the simplified schema (USER/ADMIN) and linked to their respective merchants/outlets.

## 🧾 Seeded Tenants Overview

### Merchants
- merchant1 — Rental Shop Demo
  - Description: Demo rental shop for testing with multiple outlets
  - Outlets: Main Branch (outlet1), Downtown Branch (outlet2)
- merchant2 — Outdoor Equipment Co.
  - Description: Outdoor equipment rental company with beach and mountain outlets
  - Outlets: Beach Branch (outlet3), Mountain Branch (outlet4)

### Outlets
- outlet1 — Main Branch (Merchant: Rental Shop Demo)
  - Address: 123 Main Street, City Center
  - Description: Main rental outlet in city center
- outlet2 — Downtown Branch (Merchant: Rental Shop Demo)
  - Address: 456 Downtown Ave, Business District
  - Description: Downtown rental outlet for business customers
- outlet3 — Beach Branch (Merchant: Outdoor Equipment Co.)
  - Address: 789 Beach Road, Coastal Area
  - Description: Beach equipment rental for water sports
- outlet4 — Mountain Branch (Merchant: Outdoor Equipment Co.)
  - Address: 321 Mountain Trail, Highland Area
  - Description: Mountain equipment rental for hiking and climbing

### Users (Accounts)
- Merchant 1 (Rental Shop Demo)
  - Admin: admin@rentalshop.com (ADMIN)
  - Staff (Main): staff@rentalshop.com (USER) → Outlet: Main Branch
  - Staff (Downtown): downtown@rentalshop.com (USER) → Outlet: Downtown Branch
- Merchant 2 (Outdoor Equipment Co.)
  - Admin: admin@outdoor.com (ADMIN)
  - Staff (Beach): beach@outdoor.com (USER) → Outlet: Beach Branch
  - Staff (Mountain): mountain@outdoor.com (USER) → Outlet: Mountain Branch

All passwords: password123

## 📊 Database Management

### View Database Contents

```bash
# Open Prisma Studio (visual interface)
yarn db:studio

# Or use the command line viewer
yarn db:view
```

### Database Commands

```bash
# Reset and reseed database
yarn db:reset

# Generate Prisma client
yarn db:generate

# Push schema changes
yarn db:push

# Seed database
yarn db:seed
```

## 📁 Project Structure

```
rentalshop-nextjs/
├── apps/
│   ├── client/          # Customer-facing app (Port 3000)
│   │   ├── app/         # Next.js 14 App Router
│   │   ├── components/  # Client-specific components
│   │   └── lib/         # Client utilities
│   ├── admin/           # Admin dashboard (Port 3001)
│   │   ├── app/         # Next.js 14 App Router
│   │   ├── components/  # Admin-specific components
│   │   └── lib/         # Admin utilities
│   └── api/             # API server (Port 3002)
│       ├── app/         # Next.js 14 App Router
│       ├── lib/         # API utilities
│       └── middleware/  # API middleware
├── packages/
│   ├── ui/              # Shared UI components
│   ├── auth/            # Authentication utilities
│   ├── database/        # Database client and utilities
│   └── utils/           # Common utilities
├── prisma/
│   ├── schema.prisma    # Database schema (SQLite for local, PostgreSQL for production)
│   └── migrations/      # Database migrations
└── scripts/
    ├── setup-database.sh # Database setup script
    └── view-database.js  # Database viewer script
```

## 🛠️ Available Commands

### Development Commands

```bash
# Start all applications
yarn dev:all

# Start with specific environment
yarn dev:local        # Local environment (SQLite)
yarn dev:development  # Development environment (PostgreSQL)
yarn dev:production   # Production environment (PostgreSQL)

# Start individual apps
cd apps/client && yarn dev    # Client app only
cd apps/admin && yarn dev     # Admin app only
cd apps/api && yarn dev       # API app only
```

### Build Commands

```bash
# Build all packages and apps
yarn build

# Build individual packages
cd packages/ui && yarn build
cd packages/auth && yarn build
cd packages/database && yarn build
cd packages/utils && yarn build
```

### Database Commands

```bash
# Local environment (SQLite)
yarn db:generate        # Generate Prisma client
yarn db:push           # Push schema to database
yarn db:seed           # Seed with sample data

# Database management
yarn db:studio         # Open Prisma Studio
yarn db:view           # View database summary
yarn db:reset          # Reset and reseed database
```

### Utility Commands

```bash
yarn lint               # Run ESLint
yarn format             # Format code with Prettier
yarn clean              # Clean build artifacts
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# If you get "EADDRINUSE" error, kill existing processes
lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
lsof -ti:3001 | xargs kill -9  # Kill process on port 3001
lsof -ti:3002 | xargs kill -9  # Kill process on port 3002
```

#### 2. Dependencies Not Found
```bash
# Clean install dependencies
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
yarn install
```

#### 3. Database Connection Issues
```bash
# Reset local database
rm -f prisma/dev.db
yarn db:generate
yarn db:push
yarn db:seed

# Or use the setup script
./scripts/setup-database.sh
```

#### 4. Build Errors
```bash
# Clean and rebuild
yarn clean
yarn build
```

### MetaMask Integration

If you see MetaMask connection errors:

1. **Install MetaMask Extension**:
   - Go to [metamask.io](https://metamask.io)
   - Install the browser extension
   - Create or import a wallet

2. **Configure MetaMask**:
   - Add test networks if needed
   - Ensure MetaMask is unlocked
   - Grant permission to the website

3. **Alternative**: The MetaMask integration is optional for basic functionality

## 🔐 Authentication & Authorization

### User Roles

1. **CLIENT**: Customers who rent items
2. **MERCHANT**: Business owners with multiple outlets
3. **OUTLET_STAFF**: Outlet managers and staff
4. **ADMIN**: System administrators

### Admin Levels

1. **STAFF**: Basic admin access
2. **MANAGER**: Enhanced admin access
3. **SUPER_ADMIN**: Full system access

## 📱 Applications Overview

### Client App (`http://localhost:3000`)
- **Purpose**: Customer-facing rental interface
- **Features**:
  - Product browsing and rental
  - User account management
  - Payment processing
  - Order tracking
- **Target Users**: End customers

### Admin App (`http://localhost:3001`)
- **Purpose**: Super admin dashboard
- **Features**:
  - Merchant management
  - System-wide analytics
  - User management
  - System settings
- **Target Users**: System administrators

### API App (`http://localhost:3002`)
- **Purpose**: Backend API server
- **Features**:
  - RESTful API endpoints
  - Authentication services
  - Database operations
  - File upload handling
- **Target Users**: Frontend applications

## 🗄️ Database Configuration

### Local Development (SQLite)
- **Database File**: `./dev.db`
- **No external dependencies required**
- **Perfect for development and testing**

### Production (PostgreSQL)
- **Requires PostgreSQL database**
- **Configure connection string in environment variables**
- **Supports advanced features and scalability**

## 🔄 Environment Types

### Local Environment (`NODE_ENV=local`)
- ✅ Uses SQLite database
- ✅ Console email logging
- ✅ Local file storage
- ✅ Debug logging
- ✅ No email verification required
- ✅ **Recommended for development**

### Development Environment (`NODE_ENV=development`)
- Uses PostgreSQL database
- Resend email service
- Cloudinary file storage
- Info logging
- Email verification enabled

### Production Environment (`NODE_ENV=production`)
- Uses PostgreSQL database
- Resend email service
- Cloudinary file storage
- Warn logging
- Email verification enabled
- Rate limiting enabled

## 🧪 Testing

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

## 📊 Health Checks

### API Health Check
```bash
curl http://localhost:3002/api/health
```

### Database Health Check
```bash
curl http://localhost:3002/api/health/database
```

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Rate limiting
- CORS configuration
- Input validation with Zod
- SQL injection prevention (Prisma)

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

1. Check this documentation
2. Search existing issues
3. Create a new issue with detailed information

## 🎯 Current Status

✅ **All applications running successfully**
- Client App: http://localhost:3000
- Admin App: http://localhost:3001
- API App: http://localhost:3002

✅ **All packages building successfully**
- UI Package: Shared components
- Auth Package: Authentication utilities
- Database Package: Database client
- Utils Package: Common utilities

✅ **Database seeded with comprehensive sample data**
- **11 Users**: Admin, Merchant, Manager, Staff, Client accounts
- **6 Categories**: Electronics, Tools, Party Equipment, Sports Equipment, Furniture, Vehicles
- **1 Merchant**: Sample Rental Company
- **3 Outlets**: Downtown Rental Center, Westside Equipment, Party Palace
- **2 Admin Records**: Super Admin accounts
- **15 Customers**: Sample customer profiles with complete information
- **13 Products**: Various rental items across all categories
- **6 Sample Orders**: Including RENT, SALE, ACTIVE, PENDING, COMPLETED, and OVERDUE orders

✅ **Authentication working**
- JWT-based authentication
- Role-based access control
- Test accounts ready for all user types

✅ **API Documentation available**
- SwaggerUI: http://localhost:3002/docs
- OpenAPI spec: http://localhost:3002/api/docs

## 🚀 Next Steps

1. **Explore the applications** using the provided test accounts
2. **Customize the environment** by editing `.env.local`
3. **Add your own data** through the admin interface
4. **Extend functionality** by modifying the packages
5. **Deploy to production** when ready 