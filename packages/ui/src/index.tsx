// ============================================================================
// SHARED COMPONENTS (Core UI Components)
// ============================================================================
export { Badge, badgeVariants } from './components/ui/badge';
export { Button, buttonVariants } from './components/ui/button';
export { ButtonClean } from './components/ui/button-clean';
export { ButtonColorful } from './components/ui/button-colorful';
export { Card, CardHeader, CardTitle, CardContent, CardDescription } from './components/ui/card';
export { CardClean, CardHeaderClean, CardTitleClean, CardContentClean } from './components/ui/card-clean';
export { CardColorful, CardHeaderColorful, CardTitleColorful, CardContentColorful } from './components/ui/card-colorful';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { ProductAvailabilityAsyncDisplay } from './components/ui/product-availability-async-display';
export { ProductAvailabilityBadge } from './components/ui/product-availability-badge';
export { ProductAvailabilityTest } from './components/ui/product-availability-test';
export { ProductAvailabilityWarning } from './components/ui/product-availability-warning';
export { SearchableSelect } from './components/ui/searchable-select';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
export { Separator } from './components/ui/separator';
export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
export { Textarea } from './components/ui/textarea';
export { DateRangePicker } from './components/ui/date-range-picker';
export type { DateRange } from './components/ui/date-range-picker';
export { Pagination } from './components/ui/pagination';

// ============================================================================
// COMPONENTS (All UI Components)
// ============================================================================
export * from './components';

// ============================================================================
// SKELETON COMPONENTS (Loading States)
// ============================================================================
export { 
  Skeleton, 
  CardSkeleton, 
  TableRowSkeleton, 
  TableSkeleton, 
  GridSkeleton, 
  FormSkeleton, 
  NavigationSkeleton, 
  StatsSkeleton, 
  CalendarSkeleton, 
  SearchSkeleton, 
  PaginationSkeleton, 
  SidebarSkeleton, 
  HeaderSkeleton 
} from './components/ui/skeleton';

// ============================================================================
// BUSINESS COMPONENTS
// ============================================================================
export { default as LoginForm } from './components/forms/LoginForm';
export { default as RegisterForm } from './components/forms/RegisterForm';
export { default as ForgetPasswordForm } from './components/forms/ForgetPasswordForm';
export { CustomerForm } from './components/forms/CustomerForm';
export { ProductForm } from './components/forms/ProductForm';
export { OrderForm } from './components/forms/OrderForm';
export { CreateOrderForm } from './components/forms/CreateOrderForm';

export { OrderDetail } from './components/features';

// ============================================================================
// REFACTORED FEATURE COMPONENTS
// ============================================================================
export { Dashboard } from './components/features/Dashboard';
export { Products, ProductFormDialog } from './components/features/Products';
export { Customers } from './components/features/Customers';
export { Orders } from './components/features/Orders';
export { Users } from './components/features/Users';
export { Calendar } from './components/features/Calendar';

// ============================================================================
// USER TYPES
// ============================================================================
export type { 
  User, 
  UserCreateInput, 
  UserUpdateInput, 
  UserFilters, 
  UserData, 
  UserAction 
} from './components/features/Users/types';

// ============================================================================
// LOADING COMPONENTS (Feature-Specific Loading States)
// ============================================================================
export { 
  DashboardLoading, 
  DashboardFocusLoading 
} from './components/features/Dashboard/components';

export { 
  ProductsLoading, 
  ProductDetailLoading 
} from './components/features/Products/components';

export { 
  CustomersLoading, 
  CustomerDetailLoading 
} from './components/features/Customers/components';

export { 
  OrdersLoading, 
  OrderDetailLoading 
} from './components/features/Orders/components';

export { 
  UsersLoading, 
  UserDetailLoading 
} from './components/features/Users/components';

export { 
  CalendarLoading, 
  CalendarEventLoading 
} from './components/features/Calendar/components';

export { 
  ShopsLoading, 
  ShopDetailLoading 
} from './components/features/Shops/components';

export { 
  SettingsLoading, 
  SettingsFormLoading, 
  ProfileLoading 
} from './components/features/Settings/components';

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================
export { DashboardWrapper, DashboardWrapperClean, DashboardWrapperColorful } from './components/layout';
export { PageWrapper, PageHeader, PageTitle, PageContent, PageSection } from './components/layout';
export { TopNavigation, ServerTopNavigation, Navigation, Sidebar } from './components/layout';
export { ColorfulQuickActions, ColorfulTodaysFocus, TodaysFocus } from './components/layout';
export { QuickActionsGrid, SearchInput, TimePeriodSelector } from './components/layout';
export { LanguageSwitcher } from './components/layout';

// ============================================================================
// CHART COMPONENTS
// ============================================================================
export { IncomeChart, OrderChart, PieChart } from './components/charts';
export { RecentOrders, TopCustomers, TopProducts } from './components/charts';
export { SimpleList, ColorfulList } from './components/charts';

// ============================================================================
// CONTEXTS & HOOKS
// ============================================================================
export { useProductAvailability } from './hooks/useProductAvailability';
export { useThrottledSearch } from './hooks/useThrottledSearch';

// ============================================================================
// UTILITIES
// ============================================================================
export { cn } from './lib/cn';
export { formatDate, formatCurrency } from './lib/utils';