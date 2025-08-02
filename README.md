# Rental Shop Next.js Monorepo

A modern rental shop management system built with Next.js, TypeScript, and Tailwind CSS using a monorepo structure.

## 🏗️ Project Structure

```
rentalshop-nextjs/
├── apps/
│   ├── client/                    # Client website for shop owners (port 3000)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── products/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── customers/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── orders/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── profile/
│   │   │   │       └── page.tsx
│   │   │   ├── api/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── customers/
│   │   │   ├── orders/
│   │   │   ├── settings/
│   │   │   └── shared/
│   │   ├── lib/
│   │   │   ├── auth/
│   │   │   ├── api/
│   │   │   └── utils/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   ├── admin/                     # Admin panel for system administrators (port 3001)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── shops/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── products/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── orders/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── profile/
│   │   │   │       └── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── shops/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── settings/
│   │   │   └── shared/
│   │   ├── lib/
│   │   │   ├── auth/
│   │   │   ├── api/
│   │   │   └── utils/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── package.json
│   └── api/                       # API for mobile apps (port 3002)
│       ├── app/
│       │   ├── api/
│       │   │   ├── auth/
│       │   │   │   ├── login/
│       │   │   │   │   └── route.ts
│       │   │   │   └── register/
│       │   │   │       └── route.ts
│       │   │   ├── users/
│       │   │   ├── shops/
│       │   │   ├── products/
│       │   │   ├── customers/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── notifications/
│       │   │   ├── docs/
│       │   │   │   └── page.tsx
│       │   │   └── openapi.json/
│       │   │       └── route.ts
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── lib/
│       │   ├── auth/
│       │   ├── database/
│       │   └── utils/
│       ├── middleware/
│       ├── types/
│       └── package.json
├── packages/
│   ├── ui/                        # Shared UI components (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── shared/
│   │   │   │   │   ├── navigation.tsx
│   │   │   │   │   ├── sidebar.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── products/
│   │   │   │   ├── customers/
│   │   │   │   ├── orders/
│   │   │   │   ├── settings/
│   │   │   │   ├── users/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── input.tsx
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   ├── lib/
│   │   │   │   ├── cn.ts
│   │   │   │   └── utils.ts
│   │   │   └── index.tsx
│   │   └── package.json
│   ├── database/                  # Prisma schema and database utilities
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── package.json
│   ├── auth/                      # Shared authentication logic
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── index.ts
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   └── types.ts
│   │   └── package.json
│   └── utils/                     # Shared utilities and helpers
│       ├── src/
│       │   ├── common.ts
│       │   ├── date.ts
│       │   ├── index.ts
│       │   └── validation.ts
│       └── package.json
├── prisma/
│   └── schema.prisma              # Database schema
├── env.example                    # Environment variables template
├── turbo.json                     # Turborepo configuration
├── package.json                   # Root package.json for monorepo
└── README.md                      # Project documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Yarn package manager
- PostgreSQL database

### Folder Structure Overview

The project follows a **monorepo structure** with three main applications and shared packages:

#### 📱 Applications (`apps/`)
- **`client/`** - Shop owner dashboard (port 3000)
- **`admin/`** - System admin panel (port 3001)  
- **`api/`** - REST API for mobile apps (port 3002)

#### 📦 Shared Packages (`packages/`)
- **`ui/`** - Reusable UI components (shadcn/ui + Tailwind)
- **`database/`** - Prisma client and database utilities
- **`auth/`** - Authentication logic and JWT handling
- **`utils/`** - Common utilities and validation schemas

#### 🗂️ App Structure Pattern
Each app follows this structure:
```
app/
├── app/                    # Next.js 13+ App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # App-specific components
│   ├── layout/           # Layout components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── products/         # Product management
│   ├── customers/        # Customer management
│   ├── orders/           # Order management
│   ├── settings/         # Settings components
│   └── shared/           # App-specific shared components
├── lib/                  # Utilities and helpers
│   ├── auth/             # Authentication utilities
│   ├── api/              # API client utilities
│   └── utils/            # General utilities
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── package.json          # App dependencies
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rentalshop-next-js
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your database and API keys
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   yarn db:generate
   
   # Push schema to database
   yarn db:push
   
   # Or run migrations
   yarn db:migrate
   ```

5. **Start development servers**
   ```bash
   # Start all apps
   yarn dev
   
   # Or start individual apps
   yarn workspace @rentalshop/client dev    # Client app (port 3000)
   yarn workspace @rentalshop/admin dev     # Admin app (port 3001)
   yarn workspace @rentalshop/api dev       # API app (port 3002)
   ```

## 📱 Applications

### Client App (Port 3000)
- **Purpose**: Website for shop owners to manage their rental business
- **Features**: 
  - Product management
  - Rental management
  - Customer management
  - Analytics dashboard
- **URL**: http://localhost:3000

### Admin App (Port 3001)
- **Purpose**: Administrative panel for system administrators
- **Features**:
  - User management
  - Shop verification
  - System analytics
  - Global settings
- **URL**: http://localhost:3001

### API App (Port 3002)
- **Purpose**: RESTful API for mobile applications
- **Features**:
  - Authentication endpoints
  - Product APIs
  - Rental APIs
  - User management APIs
- **URL**: http://localhost:3002
- **API Documentation**: http://localhost:3002/api/docs

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

### Backend
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js + JWT
- **API**: Next.js API Routes
- **Documentation**: Swagger UI

### Development
- **Monorepo**: Turborepo
- **Package Manager**: Yarn
- **Linting**: ESLint
- **Formatting**: Prettier

## 📋 Development Guidelines

### 🎯 Project Goals
- **Clean**: Minimal, uncluttered design with proper spacing and hierarchy
- **Modern**: Contemporary design patterns, smooth animations, and current trends
- **Easy to Use**: Intuitive navigation, clear feedback, and accessible interactions

### 🏗️ Architecture Principles
1. **Monorepo Structure**: Shared packages for reusability
2. **Component-First**: Reusable UI components in `@rentalshop/ui`
3. **Type Safety**: Full TypeScript implementation
4. **API-First**: RESTful API design with Swagger documentation
5. **Mobile-First**: Responsive design for all screen sizes

### 📁 File Organization Rules
- **Components**: Use PascalCase (`ProductCard.tsx`)
- **Utilities**: Use camelCase (`formatCurrency.ts`)
- **Constants**: Use UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)
- **Pages**: Use kebab-case for routes (`product-details.tsx`)

### 🎨 Design System
- **Brand Colors**: Consistent color palette across all apps
- **Typography**: Inter font family with proper hierarchy
- **Spacing**: Tailwind's spacing scale (4px, 8px, 12px, 16px, 24px, 32px)
- **Components**: shadcn/ui base components with custom styling

### 🔧 Development Workflow
1. **Feature Development**: Create feature branches from `main`
2. **Component Development**: Build in `packages/ui` first, then use in apps
3. **API Development**: Start with API routes, then build frontend
4. **Testing**: Test components and API endpoints
5. **Documentation**: Update README and API docs

### 📱 App-Specific Guidelines

#### Client App (Shop Owners)
- **Focus**: Product management, customer management, rental tracking
- **Navigation**: Sidebar layout with dashboard overview
- **Features**: Product catalog, customer database, order management

#### Admin App (System Administrators)
- **Focus**: User management, shop verification, system analytics
- **Navigation**: Top navigation with admin-specific features
- **Features**: User management, shop verification, system settings

#### API App (Mobile Backend)
- **Focus**: RESTful API for mobile applications
- **Documentation**: Swagger UI for API exploration
- **Authentication**: JWT-based authentication
- **Validation**: Zod schemas for request/response validation

## 🎨 Design System

### Brand Colors
- **Primary**: #0F9347 (Green)
- **Secondary**: #2B3349 (Dark Blue)
- **Action**: #008AE8 (Blue)
- **Success**: #10B981 (Green)
- **Danger**: #EF4444 (Red)
- **Warning**: #f19920 (Orange)

### Typography
- **Font Family**: Inter
- **Weights**: 300, 400, 500, 600, 700, 800

## 📦 Packages

### @rentalshop/ui
Shared UI components built with shadcn/ui and Radix UI.

```typescript
import { Button, Input, Card } from '@rentalshop/ui';
```

### @rentalshop/database
Database utilities and Prisma client.

```typescript
import { prisma } from '@rentalshop/database';
```

### @rentalshop/auth
Authentication utilities and JWT handling.

```typescript
import { loginUser, registerUser } from '@rentalshop/auth';
```

### @rentalshop/utils
Shared utilities and validation schemas.

```typescript
import { loginSchema, formatCurrency } from '@rentalshop/utils';
```

## 🔐 Authentication

The system supports three user roles:

1. **CLIENT**: Regular users who can rent products
2. **SHOP_OWNER**: Shop owners who manage their rental business
3. **ADMIN**: System administrators with full access

### Login Flow
- Users can log in through the shared login component
- Role-based redirection to appropriate dashboards
- JWT token-based authentication
- Automatic token refresh

## 🗄️ Database Schema

The database includes the following main entities:

- **Users**: User accounts with role-based access
- **ShopOwners**: Extended user data for shop owners
- **Admins**: Extended user data for administrators
- **Shops**: Rental shops managed by shop owners
- **Categories**: Product categories
- **Products**: Rental items
- **Rentals**: Rental transactions
- **Payments**: Payment records
- **Notifications**: User notifications

## 📚 API Documentation

Access the interactive API documentation at:
- **Swagger UI**: http://localhost:3002/api/docs
- **OpenAPI Spec**: http://localhost:3002/api/openapi.json

## 🚀 Running the Project

### Development Commands

```bash
# Start all applications
yarn dev

# Start individual applications
yarn workspace @rentalshop/client dev    # Client app (port 3000)
yarn workspace @rentalshop/admin dev     # Admin app (port 3001)
yarn workspace @rentalshop/api dev       # API app (port 3002)

# Build all applications
yarn build

# Lint all applications
yarn lint

# Format code
yarn format
```

### Database Commands

```bash
# Generate Prisma client
yarn db:generate

# Push schema to database
yarn db:push

# Run migrations
yarn db:migrate

# Open Prisma Studio
yarn db:studio
```

### API Documentation

```bash
# Start API with Swagger docs
yarn swagger
```

### Production Deployment

```bash
# Build for production
yarn build

# Start production servers
yarn start
```

## 🔧 Common Development Tasks

### Adding a New Page
1. Create page file in appropriate app: `apps/[app]/app/[route]/page.tsx`
2. Add navigation link in shared components
3. Update types if needed
4. Test the route

### Adding a New API Endpoint
1. Create route file: `apps/api/app/api/[endpoint]/route.ts`
2. Add validation schemas in `packages/utils`
3. Update Swagger documentation
4. Test the endpoint

### Creating a New UI Component
1. Build in `packages/ui/src/components/[category]/`
2. Export from `packages/ui/src/index.tsx`
3. Use in apps: `import { Component } from '@rentalshop/ui'`
4. Test across different apps

### Database Schema Changes
1. Update `prisma/schema.prisma`
2. Generate client: `yarn db:generate`
3. Create migration: `yarn db:migrate`
4. Update types in `packages/database`

## 📝 Environment Variables

Create a `.env` file based on `env.example`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/rentalshop"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# API URLs
CLIENT_URL="http://localhost:3000"
ADMIN_URL="http://localhost:3001"
API_URL="http://localhost:3002"

# File Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

## 🚨 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear all caches and reinstall
rm -rf node_modules
rm -rf .next
rm -rf dist
yarn install
yarn build
```

#### Database Connection Issues
```bash
# Check database connection
yarn db:studio

# Reset database (WARNING: This will delete all data)
yarn db:push --force-reset
```

#### Port Conflicts
```bash
# Check what's running on ports
lsof -i :3000
lsof -i :3001
lsof -i :3002

# Kill processes if needed
kill -9 [PID]
```

#### TypeScript Errors
```bash
# Regenerate types
yarn db:generate
yarn workspace @rentalshop/ui build
```

### Performance Tips
- Use `yarn dev` for development (runs all apps)
- Use individual workspace commands for faster builds
- Use `yarn build` to test production builds
- Use `yarn lint` to catch issues early

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `yarn install`
4. Set up environment: `cp env.example .env`
5. Set up database: `yarn db:push`
6. Start development: `yarn dev`

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write meaningful commit messages
- Test your changes across all apps
- Update documentation when needed

### Pull Request Process
1. Create a feature branch from `main`
2. Make your changes following the guidelines
3. Test across all applications
4. Update documentation if needed
5. Submit a pull request with clear description
6. Ensure all CI checks pass

### Commit Message Format
```
type(scope): description

feat(ui): add new product card component
fix(api): resolve authentication bug
docs(readme): update installation instructions
```

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@rentalshop.com or create an issue in the repository. 