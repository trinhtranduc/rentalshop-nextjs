// ============================================================================
// DATABASE PACKAGE EXPORTS - DUAL ID SYSTEM
// ============================================================================

// Database client
export { prisma } from './client';

// Dual ID utility functions (RECOMMENDED)
export {
  // Entity lookup functions
  findOutletByPublicId,
  findCustomerByPublicId,
  findProductByPublicId,
  findUserByPublicId,
  findMerchantByPublicId,
  findCategoryByPublicId,
  findOrderByPublicId,
  
  // Public ID generation functions
  generateNextUserPublicId,
  generateNextMerchantPublicId,
  generateNextOutletPublicId,
  generateNextProductPublicId,
  generateNextCustomerPublicId,
  generateNextCategoryPublicId,
  generateNextOrderPublicId,
  
  // Utility functions
  checkDatabaseConnection,
  
  // ID conversion functions
  convertOutletPublicIdToDatabaseId,
  convertCustomerPublicIdToDatabaseId,
  convertProductPublicIdToDatabaseId,
  convertUserPublicIdToDatabaseId,
  convertMerchantPublicIdToDatabaseId,
  convertCategoryPublicIdToDatabaseId,
  convertOrderPublicIdToDatabaseId,
} from './utils';

// Dual ID order functions (RECOMMENDED)
export {
  getOrderByPublicId,
  getOrderByNumber,
  createOrder,
  updateOrder,
  searchOrders,
  getOrderStats,
  cancelOrder,
  getOverdueRentals,
} from './order';

// Dual ID customer functions (RECOMMENDED)
export {
  getCustomerByPublicId,
  getCustomerByEmail,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  searchCustomers,
  getCustomersByMerchant,
  customerExistsByEmail,
  customerExistsByPhone,
} from './customer';

// Dual ID product functions (RECOMMENDED)
export {
  getProductByPublicId,
  getProductByBarcode,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByMerchant,
  getProductsByCategory,
  updateProductStock,
} from './product';

// Dual ID outlet functions (RECOMMENDED)
export {
  getOutletByPublicId,
  searchOutlets,
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletsByMerchant,
} from './outlet';

// Dual ID user functions (RECOMMENDED)
export {
  findUserById,
  getUserByPublicId,
  createUser,
  updateUser,
  getUsersByMerchant,
  getUsersByOutlet,
  softDeleteUser,
  restoreUser,
} from './user';

// ============================================================================
// LEGACY FUNCTIONS - DEPRECATED
// ============================================================================
// These are kept for backward compatibility but should not be used in new code
// Use the new dual ID functions above instead

// export * from './utils';
// export * from './order';
// export * from './customer';
// export * from './product'; 