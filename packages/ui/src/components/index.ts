// ============================================================================
// UI COMPONENTS (Base UI Components)
// ============================================================================
export { Button, buttonVariants } from './ui/button';
export { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
export { ButtonColorful, buttonColorfulVariants } from './ui/button-colorful';
export { CardColorful, CardHeaderColorful, CardTitleColorful, CardContentColorful, CardDescriptionColorful, CardFooterColorful } from './ui/card-colorful';
export { ButtonClean, buttonCleanVariants } from './ui/button-clean';
export { CardClean, CardHeaderClean, CardTitleClean, CardContentClean, CardDescriptionClean, CardFooterClean } from './ui/card-clean';
export { Input } from './ui/input';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from './ui/select';
export { Textarea } from './ui/textarea';
export { Badge, badgeVariants } from './ui/badge';
export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableCaption 
} from './ui/table';
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from './ui/dialog';

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================
export { Layout } from './layout/layout';
export { Navigation } from './layout/navigation';
export { Sidebar } from './layout/sidebar';
export { LanguageSwitcher } from './layout/LanguageSwitcher';
export { SearchInput } from './layout/SearchInput';
export { default as DashboardWrapper } from './layout/DashboardWrapper';
export { default as DashboardWrapperColorful } from './layout/DashboardWrapperColorful';
export { default as DashboardWrapperClean } from './layout/DashboardWrapperClean';
export { TimePeriodSelector } from './layout/TimePeriodSelector';
export { EnhancedStatCard } from './layout/EnhancedStatCard';
export { QuickActionsGrid } from './layout/QuickActionsGrid';
export { TodaysFocus } from './layout/TodaysFocus';
export { ColorfulQuickActions } from './layout/ColorfulQuickActions';
export { ColorfulTodaysFocus } from './layout/ColorfulTodaysFocus';

// ============================================================================
// FORM COMPONENTS
// ============================================================================
export { default as LoginForm } from './forms/LoginForm';
export { default as RegisterForm } from './forms/RegisterForm';
export { default as ForgetPasswordForm } from './forms/ForgetPasswordForm';
export { CustomerForm } from './forms/CustomerForm';
export { OrderForm } from './forms/OrderForm';

// ============================================================================
// FEATURE COMPONENTS (Business Logic Components)
// ============================================================================
export { CustomerCard } from './features/CustomerCard';
export { CustomerTable } from './features/CustomerTable';
export { CustomerDialog } from './features/CustomerDialog';
export { ProductCard } from './features/ProductCard';
export { ProductGrid } from './features/ProductGrid';
export { ProductTable } from './features/ProductTable';
export { ProductDialog } from './features/ProductDialog';
export { OrderCard } from './features/OrderCard';
export type { Product as GridProduct } from './features/ProductGrid';

// ============================================================================
// CHART COMPONENTS (Analytics & Dashboard)
// ============================================================================
export { IncomeChart } from './charts/IncomeChart';
export { OrderChart } from './charts/OrderChart';
export { TopProducts } from './charts/TopProducts';
export { TopCustomers } from './charts/TopCustomers';
export { RecentOrders } from './charts/RecentOrders';
export { SimpleList } from './charts/SimpleList';
export { ColorfulList } from './charts/ColorfulList'; 