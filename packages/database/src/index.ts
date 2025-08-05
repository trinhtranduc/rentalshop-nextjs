// Database client
export { prisma } from './client';

// Database configuration
export { getDatabaseConfig } from './config';

// Customer management
export {
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomersByMerchant,
  getCustomers,
} from './customer';

// Product management
export {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByOutlet,
  getProductsByMerchant,
  updateProductStock,
  getProducts,
} from './product';

// Order management
export {
  generateOrderNumber,
  createOrder,
  getOrderById,
  getOrderByNumber,
  updateOrder,
  searchOrders,
  getOrderStats,
  createPayment,
  getOrderPayments,
  addOrderHistory,
  getOverdueRentals,
  cancelOrder,
  deleteOrder,
} from './order';

// Database utilities
export {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  createMerchant,
  findMerchantByUserId,
  findMerchantById,
  createOutlet,
  findOutletById,
  findOutletsByMerchantId,
  createOutletStaff,
  findOutletStaffByUserId,
  findOutletStaffByOutletId,
  checkDatabaseConnection,
} from './utils';

// Types
export type {
  CustomerWithMerchant,
  CustomerInput,
  CustomerUpdateInput,
  CustomerFilters,
  CustomerSearchFilter,
  CustomerSearchResult,
  CustomerSearchResponse,
  ProductSearchResult,
  ProductSearchResponse,
  OrderType,
  OrderStatus,
  PaymentMethod,
  PaymentType,
  PaymentStatus,
  OrderWithDetails,
  OrderItemWithProduct,
  OrderInput,
  OrderItemInput,
  OrderUpdateInput,
  OrderFilters,
  OrderSearchFilter,
  OrderSearchResult,
  OrderSearchResponse,
  PaymentInput,
  PaymentUpdateInput,
  OrderHistoryInput,
  OrderStats,
  OrderStatsByPeriod,
  OrderExportData,
} from './types';

// Product types
export type {
  ProductFilters,
  ProductListOptions,
  ProductSearchFilter,
} from './product'; 