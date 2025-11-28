/**
 * Import Data Validator
 * Validates JSON import data structure and content
 */

export interface ValidationError {
  row: number;
  entity: 'customer' | 'product' | 'order';
  field: string;
  error: string;
  value: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  preview?: {
    customers: any[];
    products: any[];
    orders: any[];
    totalCounts: {
      customers: number;
      products: number;
      orders: number;
    };
  };
}

/**
 * Validate customer data
 */
function validateCustomer(customer: any, index: number, merchantId: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!customer.firstName || typeof customer.firstName !== 'string' || customer.firstName.trim() === '') {
    errors.push({
      row: index,
      entity: 'customer',
      field: 'firstName',
      error: 'First name is required',
      value: customer.firstName
    });
  }

  if (!customer.lastName || typeof customer.lastName !== 'string' || customer.lastName.trim() === '') {
    errors.push({
      row: index,
      entity: 'customer',
      field: 'lastName',
      error: 'Last name is required',
      value: customer.lastName
    });
  }

  if (customer.email && typeof customer.email !== 'string') {
    errors.push({
      row: index,
      entity: 'customer',
      field: 'email',
      error: 'Email must be a string',
      value: customer.email
    });
  }

  if (customer.phone && typeof customer.phone !== 'string') {
    errors.push({
      row: index,
      entity: 'customer',
      field: 'phone',
      error: 'Phone must be a string',
      value: customer.phone
    });
  }

  // Validate merchantId matches
  if (customer.merchantId && customer.merchantId !== merchantId) {
    errors.push({
      row: index,
      entity: 'customer',
      field: 'merchantId',
      error: `Merchant ID mismatch. Expected ${merchantId}, got ${customer.merchantId}`,
      value: customer.merchantId
    });
  }

  return errors;
}

/**
 * Validate product data
 */
function validateProduct(product: any, index: number, merchantId: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
    errors.push({
      row: index,
      entity: 'product',
      field: 'name',
      error: 'Product name is required',
      value: product.name
    });
  }

  if (product.rentPrice !== undefined && (typeof product.rentPrice !== 'number' || product.rentPrice < 0)) {
    errors.push({
      row: index,
      entity: 'product',
      field: 'rentPrice',
      error: 'Rent price must be a non-negative number',
      value: product.rentPrice
    });
  }

  if (product.totalStock !== undefined && (typeof product.totalStock !== 'number' || product.totalStock < 0)) {
    errors.push({
      row: index,
      entity: 'product',
      field: 'totalStock',
      error: 'Total stock must be a non-negative number',
      value: product.totalStock
    });
  }

  // Validate merchantId matches
  if (product.merchantId && product.merchantId !== merchantId) {
    errors.push({
      row: index,
      entity: 'product',
      field: 'merchantId',
      error: `Merchant ID mismatch. Expected ${merchantId}, got ${product.merchantId}`,
      value: product.merchantId
    });
  }

  return errors;
}

/**
 * Validate order data
 */
function validateOrder(order: any, index: number, merchantId: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!order.orderType || !['RENT', 'SALE'].includes(order.orderType)) {
    errors.push({
      row: index,
      entity: 'order',
      field: 'orderType',
      error: 'Order type must be RENT or SALE',
      value: order.orderType
    });
  }

  if (!order.status || typeof order.status !== 'string') {
    errors.push({
      row: index,
      entity: 'order',
      field: 'status',
      error: 'Order status is required',
      value: order.status
    });
  }

  if (!order.orderItems || !Array.isArray(order.orderItems) || order.orderItems.length === 0) {
    errors.push({
      row: index,
      entity: 'order',
      field: 'orderItems',
      error: 'Order must have at least one order item',
      value: order.orderItems
    });
  } else {
    // Validate order items
    order.orderItems.forEach((item: any, itemIndex: number) => {
      if (!item.productId && !item.oldProductId) {
        errors.push({
          row: index,
          entity: 'order',
          field: `orderItems[${itemIndex}].productId`,
          error: 'Order item must have productId or oldProductId',
          value: item
        });
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push({
          row: index,
          entity: 'order',
          field: `orderItems[${itemIndex}].quantity`,
          error: 'Order item quantity must be a positive number',
          value: item.quantity
        });
      }
    });
  }

  if (typeof order.totalAmount !== 'number' || order.totalAmount < 0) {
    errors.push({
      row: index,
      entity: 'order',
      field: 'totalAmount',
      error: 'Total amount must be a non-negative number',
      value: order.totalAmount
    });
  }

  return errors;
}

/**
 * Validate import JSON data
 */
export function validateImportData(
  data: any,
  merchantId: number,
  previewLimit: number = 10
): ValidationResult {
  const errors: ValidationError[] = [];
  const preview: any = {
    customers: [],
    products: [],
    orders: []
  };

  // Validate JSON structure
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{
        row: 0,
        entity: 'customer',
        field: 'data',
        error: 'Invalid JSON structure',
        value: data
      }]
    };
  }

  const exportData = data.data || data;

  // Validate customers
  if (exportData.customers) {
    if (!Array.isArray(exportData.customers)) {
      errors.push({
        row: 0,
        entity: 'customer',
        field: 'customers',
        error: 'Customers must be an array',
        value: exportData.customers
      });
    } else {
      exportData.customers.forEach((customer: any, index: number) => {
        const customerErrors = validateCustomer(customer, index, merchantId);
        errors.push(...customerErrors);
        
        // Add to preview
        if (index < previewLimit) {
          preview.customers.push(customer);
        }
      });
    }
  }

  // Validate products
  if (exportData.products) {
    if (!Array.isArray(exportData.products)) {
      errors.push({
        row: 0,
        entity: 'product',
        field: 'products',
        error: 'Products must be an array',
        value: exportData.products
      });
    } else {
      exportData.products.forEach((product: any, index: number) => {
        const productErrors = validateProduct(product, index, merchantId);
        errors.push(...productErrors);
        
        // Add to preview
        if (index < previewLimit) {
          preview.products.push(product);
        }
      });
    }
  }

  // Validate orders
  if (exportData.orders) {
    if (!Array.isArray(exportData.orders)) {
      errors.push({
        row: 0,
        entity: 'order',
        field: 'orders',
        error: 'Orders must be an array',
        value: exportData.orders
      });
    } else {
      exportData.orders.forEach((order: any, index: number) => {
        const orderErrors = validateOrder(order, index, merchantId);
        errors.push(...orderErrors);
        
        // Add to preview
        if (index < previewLimit) {
          preview.orders.push(order);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    preview: {
      customers: preview.customers,
      products: preview.products,
      orders: preview.orders,
      totalCounts: {
        customers: exportData.customers?.length || 0,
        products: exportData.products?.length || 0,
        orders: exportData.orders?.length || 0
      }
    }
  };
}

