// ============================================================================
// SHARED COMPONENTS (Core UI Components)
// ============================================================================

// Basic Components
export { Button, buttonVariants } from './shared/button';
export { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './shared/card';
export { Input } from './shared/input';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from './shared/select';
export { Textarea } from './shared/textarea';
export { Badge, badgeVariants } from './shared/badge';

// Layout Components
export { Layout } from './shared/layout';
export { Navigation } from './shared/navigation';
export { Sidebar } from './shared/sidebar';
export { LanguageSwitcher } from './shared/LanguageSwitcher';
export { SearchInput } from './shared/SearchInput';

// ============================================================================
// AUTH COMPONENTS
// ============================================================================
export { default as LoginForm } from './auth/LoginForm';
export { default as RegisterForm } from './auth/RegisterForm';
export { default as ForgetPasswordForm } from './auth/ForgetPasswordForm';

// ============================================================================
// CUSTOMER COMPONENTS
// ============================================================================
export { CustomerCard } from './customers/CustomerCard';
export { CustomerForm } from './customers/CustomerForm';

// ============================================================================
// PRODUCT COMPONENTS
// ============================================================================
export { ProductCard } from './products/ProductCard';
export { ProductGrid } from './products/ProductGrid';
export type { Product } from './products/ProductGrid';

// ============================================================================
// ORDER COMPONENTS
// ============================================================================
export { OrderCard } from './orders/OrderCard';
export { OrderForm } from './orders/OrderForm';

// ============================================================================
// DASHBOARD COMPONENTS
// ============================================================================
// Add dashboard components here when created

// ============================================================================
// SETTINGS COMPONENTS
// ============================================================================
// Add settings components here when created

// ============================================================================
// USERS COMPONENTS
// ============================================================================
// Add user management components here when created 