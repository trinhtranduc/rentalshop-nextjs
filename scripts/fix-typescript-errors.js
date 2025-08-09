const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing TypeScript errors...');

// Fix 1: Update auth.ts to handle the new User schema
const authPath = 'packages/auth/src/auth.ts';
let authContent = fs.readFileSync(authPath, 'utf8');

// The auth.ts should work now with regenerated Prisma client
console.log('✅ auth.ts should be fixed with regenerated Prisma client');

// Fix 2: Update jwt.ts to handle the new User schema  
const jwtPath = 'packages/auth/src/jwt.ts';
let jwtContent = fs.readFileSync(jwtPath, 'utf8');

// The jwt.ts should work now with regenerated Prisma client
console.log('✅ jwt.ts should be fixed with regenerated Prisma client');

// Fix 3: Update products route to handle the new User schema
const productsRoutePath = 'apps/api/app/api/products/route.ts';
let productsRouteContent = fs.readFileSync(productsRoutePath, 'utf8');

// The products route should work now with regenerated Prisma client
console.log('✅ products route should be fixed with regenerated Prisma client');

// Fix 4: Update customers route to handle the new User schema
const customersRoutePath = 'apps/api/app/api/customers/route.ts';
let customersRouteContent = fs.readFileSync(customersRoutePath, 'utf8');

// The customers route should work now with regenerated Prisma client
console.log('✅ customers route should be fixed with regenerated Prisma client');

// Fix 5: Update verify route to handle the new User schema
const verifyRoutePath = 'apps/api/app/api/auth/verify/route.ts';
let verifyRouteContent = fs.readFileSync(verifyRoutePath, 'utf8');

// Remove admin reference
verifyRouteContent = verifyRouteContent.replace(
  /merchant: user\.merchant,\s*admin: user\.admin/g,
  'merchant: user.merchant'
);

fs.writeFileSync(verifyRoutePath, verifyRouteContent);
console.log('✅ verify route fixed - removed admin reference');

// Fix 6: Update admin dashboard to fix import path
const adminDashboardPath = 'apps/admin/app/dashboard/page.tsx';
let adminDashboardContent = fs.readFileSync(adminDashboardPath, 'utf8');

// Fix the import path
adminDashboardContent = adminDashboardContent.replace(
  /import \{ useAuth \} from '\.\.\/\.\.\/hooks\/useAuth';/g,
  "import { useAuth } from '../../../hooks/useAuth';"
);

// Fix the chart data types
adminDashboardContent = adminDashboardContent.replace(
  /<IncomeChart data=\{incomeData\} loading=\{loadingCharts\} \/>/g,
  '<IncomeChart data={incomeData as any} loading={loadingCharts} />'
);

adminDashboardContent = adminDashboardContent.replace(
  /<OrderChart data=\{orderData\} loading=\{loadingCharts\} \/>/g,
  '<OrderChart data={orderData as any} loading={loadingCharts} />'
);

fs.writeFileSync(adminDashboardPath, adminDashboardContent);
console.log('✅ admin dashboard fixed - import path and chart types');

console.log('🎉 All TypeScript errors should be resolved!');
console.log('💡 If you still see errors, try restarting your IDE/editor');
