/**
 * Import Data Validator
 * Validates JSON import data structure and content
 * Refactored to use generic validation helpers (DRY principle)
 */

import { validateEntity, type ValidationConfig } from './validation-helpers';

export interface ImportValidationError {
  row: number;
  entity: 'customer' | 'product' | 'order';
  field: string;
  error: string;
  value: any;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: ImportValidationError[];
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
 * Validation configurations for each entity type
 */
const customerValidationConfig: ValidationConfig = {
      entity: 'customer',
  merchantIdField: 'merchantId',
  rules: [
    {
      field: 'firstName',
      required: true,
      type: 'string',
      minLength: 1
    },
    {
      field: 'lastName',
      required: true,
      type: 'string',
      minLength: 1
    },
    {
      field: 'email',
      required: false,
      type: 'string'
    },
    {
      field: 'phone',
      required: false,
      type: 'string'
    }
  ]
};

const productValidationConfig: ValidationConfig = {
      entity: 'product',
  merchantIdField: 'merchantId',
  rules: [
    {
      field: 'name',
      required: true,
      type: 'string',
      minLength: 1
    },
    {
      field: 'rentPrice',
      required: false,
      type: 'number',
      min: 0
    },
    {
      field: 'totalStock',
      required: false,
      type: 'number',
      min: 0
    }
  ]
};

const orderValidationConfig: ValidationConfig = {
      entity: 'order',
  rules: [
    {
      field: 'orderType',
      required: true,
      enum: ['RENT', 'SALE']
    },
    {
      field: 'status',
      required: true,
      type: 'string'
    },
    {
      field: 'orderItems',
      required: true,
      type: 'array',
      custom: (value: any) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Order must have at least one order item';
        }
        return null;
      },
      nested: [
        {
          field: 'productId',
          required: false,
          custom: (value: any, item: any) => {
            if (!value && !item.oldProductId) {
              return 'Order item must have productId or oldProductId';
      }
            return null;
          }
        },
        {
          field: 'quantity',
          required: true,
          type: 'number',
          min: 1
        }
      ]
    },
    {
      field: 'totalAmount',
      required: true,
      type: 'number',
      min: 0
    }
  ]
};

/**
 * Validate customer data using generic validation
 */
function validateCustomer(customer: any, index: number, merchantId: number): ImportValidationError[] {
  return validateEntity(customer, index, customerValidationConfig, merchantId);
}

/**
 * Validate product data using generic validation
 */
function validateProduct(product: any, index: number, merchantId: number): ImportValidationError[] {
  return validateEntity(product, index, productValidationConfig, merchantId);
  }

/**
 * Validate order data using generic validation
 */
function validateOrder(order: any, index: number, merchantId: number): ImportValidationError[] {
  return validateEntity(order, index, orderValidationConfig, merchantId);
}

/**
 * Validate import JSON data
 */
export function validateImportData(
  data: any,
  merchantId: number,
  previewLimit: number = 10
): ImportValidationResult {
  const errors: ImportValidationError[] = [];
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

