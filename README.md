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

## 🔐 Default Login Accounts

After seeding the database, you can use these test accounts:

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

### **Client App (http://localhost:3000)**
- **Email**: `client@rentalshop.com`
- **Password**: `client123`
- **Role**: Customer

### **Admin App (http://localhost:3001)**
- **Email**: `admin@rentalshop.com`
- **Password**: `admin123`
- **Role**: Super Admin

### **Additional Test Accounts**
- **Merchant**: `merchant@rentalshop.com` / `merchant123`
- **Outlet Manager**: `manager@rentalshop.com` / `manager123`
- **Outlet Staff**: `staff@rentalshop.com` / `staff123`

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
│   ├── schema.prisma    # Production schema (PostgreSQL)
│   └── schema.local.prisma # Local schema (SQLite)
└── scripts/
    └── setup-env.sh     # Environment setup script
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
yarn db:local:generate  # Generate Prisma client
yarn db:local:push      # Push schema to database
yarn db:local:seed      # Seed with sample data

# Development/Production (PostgreSQL)
yarn db:dev:generate    # Generate Prisma client
yarn db:dev:push        # Push schema to database
yarn db:dev:seed        # Seed with sample data

# Database management
yarn db:studio          # Open Prisma Studio
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
rm -f dev.db
yarn db:local:generate
yarn db:local:push
yarn db:local:seed
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

✅ **Database seeded with sample data**
- Test accounts available for all user types
- Sample data for testing functionality

## 🚀 Next Steps

1. **Explore the applications** using the provided test accounts
2. **Customize the environment** by editing `.env.local`
3. **Add your own data** through the admin interface
4. **Extend functionality** by modifying the packages
5. **Deploy to production** when ready 