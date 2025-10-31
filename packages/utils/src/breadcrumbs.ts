/**
 * Breadcrumb Helper Utilities
 * 
 * Centralized breadcrumb generators for consistent navigation across the app
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

/**
 * Products Module Breadcrumbs
 */
export const productBreadcrumbs = {
  // Home > Products
  list: (): BreadcrumbItem[] => [
    { label: 'Products' }
  ],

  // Home > Products > Product Name
  detail: (productName: string, productId: number): BreadcrumbItem[] => [
    { label: 'Products', href: '/products' },
    { label: productName }
  ],

  // Home > Products > Product Name > Edit
  edit: (productName: string, productId: number): BreadcrumbItem[] => [
    { label: 'Products', href: '/products' },
    { label: productName, href: `/products/${productId}` },
    { label: 'Edit' }
  ],

  // Home > Products > Product Name > Orders
  orders: (productName: string, productId: number): BreadcrumbItem[] => [
    { label: 'Products', href: '/products' },
    { label: productName, href: `/products/${productId}` },
    { label: 'Orders' }
  ]
};

/**
 * Orders Module Breadcrumbs
 */
export const orderBreadcrumbs = {
  // Home > Orders
  list: (): BreadcrumbItem[] => [
    { label: 'Orders' }
  ],

  // Home > Orders > ORD-XXX-XXXX
  detail: (orderNumber: string): BreadcrumbItem[] => [
    { label: 'Orders', href: '/orders' },
    { label: orderNumber }
  ],

  // Home > Orders > ORD-XXX-XXXX > Edit
  edit: (orderNumber: string, orderId: string): BreadcrumbItem[] => [
    { label: 'Orders', href: '/orders' },
    { label: orderNumber, href: `/orders/${orderId}` },
    { label: 'Edit' }
  ],

  // Home > Orders > Create
  create: (): BreadcrumbItem[] => [
    { label: 'Orders', href: '/orders' },
    { label: 'Create' }
  ]
};

/**
 * Customers Module Breadcrumbs
 */
export const customerBreadcrumbs = {
  // Home > Customers
  list: (): BreadcrumbItem[] => [
    { label: 'Customers' }
  ],

  // Home > Customers > Customer Name
  detail: (customerName: string, customerId: number): BreadcrumbItem[] => [
    { label: 'Customers', href: '/customers' },
    { label: customerName }
  ],

  // Home > Customers > Customer Name > Edit
  edit: (customerName: string, customerId: number): BreadcrumbItem[] => [
    { label: 'Customers', href: '/customers' },
    { label: customerName, href: `/customers/${customerId}` },
    { label: 'Edit' }
  ],

  // Home > Customers > Customer Name > Orders
  orders: (customerName: string, customerId: number): BreadcrumbItem[] => [
    { label: 'Customers', href: '/customers' },
    { label: customerName, href: `/customers/${customerId}` },
    { label: 'Orders' }
  ]
};

/**
 * Users Module Breadcrumbs
 */
export const userBreadcrumbs = {
  // Home > Dashboard > Users
  list: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Users' }
  ],

  // Home > Dashboard > Users > User Name
  detail: (userName: string, userId: number): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Users', href: '/users' },
    { label: userName }
  ],

  // Home > Dashboard > Users > User Name > Edit
  edit: (userName: string, userId: number): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Users', href: '/users' },
    { label: userName, href: `/users/${userId}` },
    { label: 'Edit' }
  ]
};

/**
 * Outlets Module Breadcrumbs
 */
export const outletBreadcrumbs = {
  // Home > Dashboard > Outlets
  list: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Outlets' }
  ],

  // Home > Dashboard > Outlets > Outlet Name
  detail: (outletName: string, outletId: number): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Outlets', href: '/outlets' },
    { label: outletName }
  ]
};

/**
 * Subscriptions Module Breadcrumbs (Admin)
 */
export const subscriptionBreadcrumbs = {
  // Home > Dashboard > Subscriptions
  list: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subscriptions' }
  ],

  // Home > Dashboard > Subscriptions > #ID - Merchant Name
  detail: (subscriptionId: number, merchantName?: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Subscriptions', href: '/subscriptions' },
    { label: `#${subscriptionId}${merchantName ? ` - ${merchantName}` : ''}` }
  ]
};

/**
 * Merchants Module Breadcrumbs (Admin)
 */
export const merchantBreadcrumbs = {
  // Home > Dashboard > Merchants
  list: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants' }
  ],

  // Home > Dashboard > Merchants > Merchant Name
  detail: (merchantName: string, merchantId: number): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName }
  ],

  // Home > Dashboard > Merchants > Merchant Name > Orders
  orders: (merchantName: string, merchantId: number): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName, href: `/merchants/${merchantId}` },
    { label: 'Orders' }
  ],

  // Home > Dashboard > Merchants > Merchant Name > Orders > ORD-XXX
  orderDetail: (merchantName: string, merchantId: number, orderNumber: string, orderId: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName, href: `/merchants/${merchantId}` },
    { label: 'Orders', href: `/merchants/${merchantId}/orders` },
    { label: orderNumber }
  ],

  // Home > Dashboard > Merchants > Merchant Name > Orders > ORD-XXX > Edit
  orderEdit: (merchantName: string, merchantId: number, orderNumber: string, orderId: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName, href: `/merchants/${merchantId}` },
    { label: 'Orders', href: `/merchants/${merchantId}/orders` },
    { label: orderNumber, href: `/merchants/${merchantId}/orders/${orderId}` },
    { label: 'Edit' }
  ]
};

/**
 * Categories Module Breadcrumbs
 */
export const categoryBreadcrumbs = {
  // Home > Dashboard > Categories
  list: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Categories' }
  ]
};

/**
 * Reports Module Breadcrumbs
 */
export const reportBreadcrumbs = {
  // Home > Dashboard > Reports
  list: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reports' }
  ],

  // Home > Dashboard > Reports > Report Type
  detail: (reportType: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reports', href: '/reports' },
    { label: reportType }
  ]
};

/**
 * Settings Module Breadcrumbs
 */
export const settingsBreadcrumbs = {
  // Home > Dashboard > Settings
  main: (): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings' }
  ],

  // Home > Dashboard > Settings > Section Name
  section: (sectionName: string): BreadcrumbItem[] => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' },
    { label: sectionName }
  ]
};

