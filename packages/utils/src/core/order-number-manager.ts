/**
 * Order Number Manager Utilities
 * 
 * Utility functions for managing order number generation across the application.
 * Provides easy-to-use functions for different order number formats.
 */

import { 
  getOutletOrderStats,
  createOrderNumberWithFormat,
  type OrderNumberFormat
} from '@rentalshop/database';

/**
 * Get outlet order statistics
 */
export async function getOutletStats(outletId: number) {
  return await getOutletOrderStats(outletId);
}

/**
 * Compare different order number formats
 */
export async function compareOrderNumberFormats(outletId: number) {
  const formats: OrderNumberFormat[] = ['sequential', 'date-based', 'random', 'hybrid'];
  const results: Record<string, any> = {};
  
  for (const format of formats) {
    try {
      const result = await createOrderNumberWithFormat(outletId, format);
      results[format] = {
        orderNumber: result.orderNumber,
        sequence: result.sequence,
        generatedAt: result.generatedAt,
        length: result.orderNumber.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results[format] = {
        error: errorMessage
      };
    }
  }
  
  return results;
}

/**
 * Format recommendations based on business needs
 */
export function getFormatRecommendations() {
  return {
    smallBusiness: {
      recommended: 'sequential',
      reason: 'Simple, easy to track, low concurrency needs',
      example: 'ORD-001-0001'
    },
    mediumBusiness: {
      recommended: 'date-based',
      reason: 'Better organization, daily reporting, moderate security',
      example: 'ORD-001-20250115-0001'
    },
    largeBusiness: {
      recommended: 'hybrid',
      reason: 'Balanced security and organization, high volume',
      example: 'ORD-001-20250115-A7B9'
    },
    highSecurity: {
      recommended: 'random',
      reason: 'Maximum security, no business intelligence leakage',
      example: 'ORD-001-A7B9C2'
    }
  };
}

/**
 * Migration helper: Convert existing orders to new format
 */
export async function migrateOrderNumbers(
  outletId: number, 
  newFormat: OrderNumberFormat
): Promise<{ success: boolean; message: string; affectedOrders: number }> {
  try {
    // This would need to be implemented based on your migration strategy
    // For now, return a placeholder
    return {
      success: false,
      message: 'Migration not implemented - requires careful planning to avoid data conflicts',
      affectedOrders: 0
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Migration failed: ${errorMessage}`,
      affectedOrders: 0
    };
  }
}

/**
 * Order number format validator
 */
export function validateOrderNumberFormat(orderNumber: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  if (!orderNumber) {
    errors.push('Order number cannot be empty');
    return { isValid: false, errors, suggestions };
  }
  
  if (!orderNumber.startsWith('ORD-')) {
    errors.push('Order number must start with "ORD-"');
    suggestions.push('Use format: ORD-{outletId}-{sequence}');
  }
  
  const parts = orderNumber.split('-');
  if (parts.length < 3) {
    errors.push('Order number must have at least 3 parts separated by hyphens');
    suggestions.push('Use format: ORD-{outletId}-{sequence}');
  }
  
  if (parts.length >= 2) {
    const outletId = parseInt(parts[1]);
    if (isNaN(outletId) || outletId < 1) {
      errors.push('Outlet ID must be a positive number');
      suggestions.push('Use format: ORD-001-0001 (where 001 is outlet ID)');
    }
  }
  
  const isValid = errors.length === 0;
  
  if (isValid) {
    suggestions.push('Order number format is valid');
  }
  
  return { isValid, errors, suggestions };
}
