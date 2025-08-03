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
│       │   │   ├── products/
│       │   │   ├── orders/
│       │   │   └── docs/
│       │   │       └── page.tsx
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       ├── lib/
│       └── package.json
├── packages/
│   ├── ui/                        # Shared UI components (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── navigation.tsx
│   │   │   │       ├── sidebar.tsx
│   │   │   │       └── layout.tsx
│   │   │   ├── lib/
│   │   │   │   ├── cn.ts
│   │   │   │   └── utils.ts
│   │   │   └── index.tsx
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── package.json
│   ├── database/                  # Prisma schema and database utilities
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── package.json
│   ├── auth/                      # Shared authentication logic
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── package.json
│   └── utils/                     # Shared utilities and helpers
│       ├── src/
│       │   ├── common.ts
│       │   ├── date.ts
│       │   ├── validation.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── package.json
├── prisma/
│   └── schema.prisma              # Database schema
├── docs/
│   └── swagger/                   # Swagger UI documentation
├── tsconfig.base.json             # Shared TypeScript configuration
├── tsup.config.base.ts            # Shared build configuration
├── package.json                   # Root package.json for monorepo
├── turbo.json                     # Turborepo configuration
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Yarn 1.22+
- PostgreSQL 14+

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd rentalshop-nextjs

# Install dependencies
yarn install

# Set up environment variables
cp env.example .env

# Set up database
yarn db:push

# Start development servers
yarn dev
```

### Available Scripts
```bash
# Development
yarn dev                    # Start all apps in development mode
yarn workspace @rentalshop/client dev    # Start client app only
yarn workspace @rentalshop/admin dev     # Start admin app only
yarn workspace @rentalshop/api dev       # Start API app only

# Build
yarn build                  # Build all packages and apps
yarn workspace @rentalshop/ui build      # Build UI package only

# Database
yarn db:generate           # Generate Prisma client
yarn db:push               # Push schema to database
yarn db:migrate            # Run migrations
yarn db:studio             # Open Prisma Studio

# Linting and Formatting
yarn lint                  # Lint all packages
yarn format                # Format code with Prettier

# Documentation
yarn swagger               # Generate API documentation
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable UI components
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Prisma ORM** - Database toolkit
- **PostgreSQL** - Primary database
- **NextAuth.js** - Authentication solution

### Development Tools
- **Turborepo** - Monorepo build system
- **Yarn Workspaces** - Package management
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **tsup** - TypeScript bundler

### Testing & Documentation
- **Swagger UI** - API documentation
- **Jest** - Testing framework
- **React Testing Library** - Component testing

## 🎯 DRY Principles & Best Practices

### **DRY (Don't Repeat Yourself) Implementation**

#### **1. Shared Configuration Files**
```typescript
// ✅ GOOD: Use shared base configurations
// tsconfig.base.json - Shared TypeScript config
// tsup.config.base.ts - Shared build config

// packages/*/tsconfig.json - Extend base config
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}

// packages/*/tsup.config.ts - Use base config
import { createBaseConfig } from '../../tsup.config.base';
export default createBaseConfig('src/index.ts', ['external-deps']);
```

#### **2. Shared UI Components**
```typescript
// ✅ GOOD: Create reusable components in packages/ui
// packages/ui/src/components/button.tsx
export const Button = ({ variant, size, children, ...props }) => {
  return (
    <button className={cn(buttonVariants({ variant, size }))} {...props}>
      {children}
    </button>
  );
};

// ✅ GOOD: Use across all apps
// apps/client/app/login/page.tsx
import { Button } from '@rentalshop/ui';
```

#### **3. Shared Utilities**
```typescript
// ✅ GOOD: Centralize common functions
// packages/utils/src/date.ts
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN').format(date);
};

// ✅ GOOD: Use everywhere
import { formatDate } from '@rentalshop/utils';
```

#### **4. Shared Types**
```typescript
// ✅ GOOD: Define types once, use everywhere
// packages/database/src/types.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ✅ GOOD: Import in all packages
import type { User } from '@rentalshop/database';
```

### **Configuration Best Practices**

#### **1. Monorepo Structure**
```bash
# ✅ GOOD: Consistent package structure
packages/
├── ui/           # UI components
├── auth/         # Authentication
├── database/     # Database utilities
└── utils/        # Common utilities

# ✅ GOOD: Consistent app structure
apps/
├── client/       # Customer-facing app
├── admin/        # Admin panel
└── api/          # API server
```

#### **2. Build Configuration**
```typescript
// ✅ GOOD: Shared build config
// tsup.config.base.ts
export const createBaseConfig = (entry: string, external: string[] = []) => 
  defineConfig({
    entry: [entry],
    format: ['esm', 'cjs'],
    dts: true,
    external: ['@rentalshop/*', ...external],
    clean: true,
    sourcemap: true,
  });

// ✅ GOOD: Package-specific config
// packages/auth/tsup.config.ts
export default createBaseConfig('src/index.ts', [
  'bcryptjs',
  'jsonwebtoken'
]);
```

#### **3. TypeScript Configuration**
```json
// ✅ GOOD: Base TypeScript config
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}

// ✅ GOOD: Package extends base
// packages/*/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### **Code Organization Best Practices**

#### **1. Component Structure**
```typescript
// ✅ GOOD: Consistent component structure
// packages/ui/src/components/button.tsx
import React from 'react';
import { cn } from '../lib/cn';
import { buttonVariants } from './button.variants';
import type { ButtonProps } from './button.types';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
```

#### **2. API Route Structure**
```typescript
// ✅ GOOD: Consistent API structure
// apps/api/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@rentalshop/auth';
import { validateLoginInput } from '@rentalshop/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = validateLoginInput(body);
    const result = await loginUser(validatedData);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

#### **3. Database Operations**
```typescript
// ✅ GOOD: Centralized database operations
// packages/database/src/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ✅ GOOD: Use everywhere
import { prisma } from '@rentalshop/database';
```

### **Development Best Practices**

#### **1. Environment Variables**
```bash
# ✅ GOOD: Use consistent naming
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# ✅ GOOD: Separate by environment
.env.local          # Local development
.env.production     # Production
.env.example        # Template
```

#### **2. Package Dependencies**
```json
// ✅ GOOD: Use workspace dependencies
{
  "dependencies": {
    "@rentalshop/ui": "workspace:*",
    "@rentalshop/auth": "workspace:*",
    "@rentalshop/database": "workspace:*",
    "@rentalshop/utils": "workspace:*"
  }
}
```

#### **3. Scripts Organization**
```json
// ✅ GOOD: Consistent script naming
{
  "scripts": {
    "dev": "next dev",
    "build": "tsup",
    "lint": "eslint src/**/*.ts*",
    "clean": "rm -rf dist node_modules"
  }
}
```

### **Performance Best Practices**

#### **1. Bundle Optimization**
```typescript
// ✅ GOOD: External dependencies
// tsup.config.ts
export default defineConfig({
  external: ['react', 'react-dom', '@rentalshop/*'],
  // Prevents bundling of large dependencies
});

// ✅ GOOD: Tree shaking
// packages/ui/src/index.tsx
export { Button } from './components/button';
export { Card } from './components/card';
// Only exports what's needed
```

#### **2. Type Safety**
```typescript
// ✅ GOOD: Strict TypeScript
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### **3. Error Handling**
```typescript
// ✅ GOOD: Consistent error handling
// packages/utils/src/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ✅ GOOD: Use everywhere
throw new AppError('User not found', 404, 'USER_NOT_FOUND');
```

### **Testing Best Practices**

#### **1. Test Structure**
```typescript
// ✅ GOOD: Consistent test structure
// packages/utils/src/__tests__/date.test.ts
import { formatDate } from '../date';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-01');
    expect(formatDate(date)).toBe('01/01/2024');
  });
});
```

#### **2. Component Testing**
```typescript
// ✅ GOOD: Test shared components
// packages/ui/src/components/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### **Documentation Best Practices**

#### **1. README Structure**
```markdown
# ✅ GOOD: Comprehensive README
## 🏗️ Project Structure
## 🚀 Quick Start
## 🛠️ Technology Stack
## 🎯 DRY Principles & Best Practices
## 📚 API Documentation
## 🚨 Troubleshooting
## 🤝 Contributing
```

#### **2. Code Documentation**
```typescript
// ✅ GOOD: JSDoc comments
/**
 * Authenticates a user with email and password
 * @param credentials - User login credentials
 * @returns Promise with user data and JWT token
 * @throws {AppError} When credentials are invalid
 */
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  // Implementation
};
```

### **Security Best Practices**

#### **1. Environment Variables**
```bash
# ✅ GOOD: Never commit secrets
.env.example          # Template with placeholder values
.env.local           # Local secrets (gitignored)
```

#### **2. Input Validation**
```typescript
// ✅ GOOD: Validate all inputs
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const validateLoginInput = (data: unknown) => {
  return loginSchema.parse(data);
};
```

#### **3. Authentication**
```typescript
// ✅ GOOD: Centralized auth logic
// packages/auth/src/auth.ts
export const loginUser = async (credentials: LoginCredentials) => {
  // Validate input
  // Hash password
  // Generate JWT
  // Return user data
};
```

### **Maintenance Best Practices**

#### **1. Dependency Management**
```bash
# ✅ GOOD: Regular updates
yarn upgrade-interactive --latest

# ✅ GOOD: Check for vulnerabilities
yarn audit
```

#### **2. Code Quality**
```bash
# ✅ GOOD: Automated checks
yarn lint          # ESLint
yarn format        # Prettier
yarn type-check    # TypeScript
```

#### **3. Git Workflow**
```bash
# ✅ GOOD: Conventional commits
feat(ui): add new product card component
fix(api): resolve authentication bug
docs(readme): update installation instructions
```

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Authenticate a user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CLIENT"
  },
  "token": "jwt-token"
}
```

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe",
  "phone": "+1234567890"
}
```

### Product Endpoints

#### GET /api/products
Get all products with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term
- `category` (string): Filter by category

#### POST /api/products
Create a new product.

**Request Body:**
```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "categoryId": "category-id",
  "images": ["image-url-1", "image-url-2"]
}
```

### Order Endpoints

#### GET /api/orders
Get all orders for the authenticated user.

#### POST /api/orders
Create a new rental order.

**Request Body:**
```json
{
  "productId": "product-id",
  "startDate": "2024-01-01",
  "endDate": "2024-01-07",
  "quantity": 1
}
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
- **Always follow DRY principles**
- **Use shared configurations and components**
- **Maintain consistent code structure**

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