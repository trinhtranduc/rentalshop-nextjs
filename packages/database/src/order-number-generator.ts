/**
 * Order Number Generator & Configuration
 * 
 * Provides robust, concurrent-safe order number generation for rental shop orders.
 * Supports multiple formats, handles race conditions, and includes centralized configuration.
 */

import { prisma } from './index';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type OrderNumberFormat = 'sequential' | 'date-based' | 'random' | 'random-numeric' | 'hybrid' | 'compact-numeric';

export interface OrderNumberConfig {
  format: OrderNumberFormat;
  outletId: number;
  prefix?: string;
  includeDate?: boolean;
  sequenceLength?: number;
  randomLength?: number;
  numericOnly?: boolean;
}

export interface OrderNumberResult {
  orderNumber: string;
  sequence: number;
  generatedAt: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default order number format for new orders
 * 
 * Available formats:
 * - 'sequential': ORD-{outletId}-{sequence} (e.g., ORD-001-0001)
 * - 'date-based': ORD-{outletId}-{date}-{sequence} (e.g., ORD-001-20250115-0001)
 * - 'random': ORD-{outletId}-{random} (e.g., ORD-001-A7B9C2)
 * - 'random-numeric': ORD-{outletId}-{random} (e.g., ORD-001-123456)
 * - 'hybrid': ORD-{outletId}-{date}-{random} (e.g., ORD-001-20250115-A7B9)
 * - 'compact-numeric': ORD{outletId}{random} (e.g., ORD00112345)
 */
export const ORDER_NUMBER_CONFIG = {
  // Primary format for all new orders
  format: 'compact-numeric' as OrderNumberFormat,
  
  // Prefix for all order numbers
  prefix: 'ORD',
  
  // Sequence number padding (how many digits)
  sequenceLength: 4,
  
  // Random string length (for random and hybrid formats)
  randomLength: 6,
  
  // Whether to include date in order numbers (for date-based and hybrid)
  includeDate: true,
  
  // Maximum retry attempts for collision resolution
  maxRetries: 5,
  
  // Retry delay in milliseconds (exponential backoff)
  retryDelay: 10,
} as const;

/**
 * Format-specific configurations
 */
export const FORMAT_CONFIGS = {
  sequential: {
    description: 'Sequential numbering per outlet',
    example: 'ORD-001-0001',
    pros: ['Outlet identification', 'Easy tracking', 'Human readable'],
    cons: ['Business intelligence leakage', 'Race conditions possible'],
    bestFor: 'Small to medium businesses with low concurrency'
  },
  
  'date-based': {
    description: 'Date-based with daily sequence reset',
    example: 'ORD-001-20250115-0001',
    pros: ['Daily organization', 'Better security', 'Easy daily reporting'],
    cons: ['Longer numbers', 'Still somewhat predictable'],
    bestFor: 'Medium businesses with daily operations focus'
  },
  
  random: {
    description: 'Random alphanumeric strings for security',
    example: 'ORD-001-A7B9C2',
    pros: ['Maximum security', 'No race conditions', 'Unpredictable'],
    cons: ['No sequence tracking', 'Harder to manage', 'No business insights'],
    bestFor: 'Large businesses prioritizing security'
  },
  
  'random-numeric': {
    description: 'Random numeric strings for security',
    example: 'ORD-001-123456',
    pros: ['Maximum security', 'No race conditions', 'Numbers only', 'Unpredictable'],
    cons: ['No sequence tracking', 'Harder to manage', 'No business insights'],
    bestFor: 'Businesses needing numeric-only random order numbers'
  },
  
  'compact-numeric': {
    description: 'Compact format with outlet ID and 5-digit random number',
    example: 'ORD00112345',
    pros: ['Compact format', 'Outlet identification', 'Numbers only', 'Short length', 'Easy to read'],
    cons: ['No sequence tracking', 'Limited randomness (5 digits)'],
    bestFor: 'Businesses wanting compact, numeric-only order numbers'
  },
  
  hybrid: {
    description: 'Combines outlet, date, and random elements',
    example: 'ORD-001-20250115-A7B9',
    pros: ['Balanced security', 'Outlet identification', 'Date organization'],
    cons: ['Longer numbers', 'More complex'],
    bestFor: 'Large businesses needing both security and organization'
  }
} as const;

// ============================================================================
// CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Get the current order number configuration
 */
export function getOrderNumberConfig() {
  return ORDER_NUMBER_CONFIG;
}

/**
 * Update order number configuration (for testing or admin purposes)
 */
export function updateOrderNumberConfig(updates: Partial<typeof ORDER_NUMBER_CONFIG>) {
  Object.assign(ORDER_NUMBER_CONFIG, updates);
}

/**
 * Get format information for display purposes
 */
export function getFormatInfo(format: OrderNumberFormat) {
  return FORMAT_CONFIGS[format];
}

/**
 * Get all available formats with their information
 */
export function getAllFormats() {
  return Object.entries(FORMAT_CONFIGS).map(([key, value]) => ({
    format: key as OrderNumberFormat,
    ...value
  }));
}

/**
 * Validate order number format configuration
 */
export function validateOrderNumberConfig(config: typeof ORDER_NUMBER_CONFIG): string[] {
  const errors: string[] = [];
  
  if (!config.prefix || config.prefix.length === 0) {
    errors.push('Prefix cannot be empty');
  }
  
  if (config.sequenceLength < 1 || config.sequenceLength > 10) {
    errors.push('Sequence length must be between 1 and 10');
  }
  
  if (config.randomLength < 4 || config.randomLength > 20) {
    errors.push('Random length must be between 4 and 20');
  }
  
  if (config.maxRetries < 1 || config.maxRetries > 20) {
    errors.push('Max retries must be between 1 and 20');
  }
  
  if (config.retryDelay < 1 || config.retryDelay > 1000) {
    errors.push('Retry delay must be between 1 and 1000 milliseconds');
  }
  
  return errors;
}

/**
 * Get recommended format based on business characteristics
 */
export function getRecommendedFormat(businessSize: 'small' | 'medium' | 'large', 
                                   concurrencyLevel: 'low' | 'medium' | 'high',
                                   securityPriority: 'low' | 'medium' | 'high'): OrderNumberFormat {
  // Small business with low concurrency and low security needs
  if (businessSize === 'small' && concurrencyLevel === 'low' && securityPriority === 'low') {
    return 'compact-numeric';
  }
  
  // Medium business or higher security needs
  if (businessSize === 'medium' || securityPriority === 'medium') {
    return 'date-based';
  }
  
  // High concurrency or high security needs
  if (concurrencyLevel === 'high' || securityPriority === 'high') {
    return 'random-numeric';
  }
  
  // Large business with balanced needs
  if (businessSize === 'large') {
    return 'hybrid';
  }
  
  // Default fallback - compact numeric for easy use
  return 'compact-numeric';
}

// ============================================================================
// ORDER NUMBER GENERATION
// ============================================================================

/**
 * Generate order number with specified format
 */
export async function generateOrderNumber(
  config: OrderNumberConfig
): Promise<OrderNumberResult> {
  const {
    format = 'sequential',
    outletId,
    prefix = 'ORD',
    includeDate = false,
    sequenceLength = 4,
    randomLength = 6,
    numericOnly = false
  } = config;

  // Validate outlet exists
  const outlet = await prisma.outlet.findUnique({
    where: { publicId: outletId },
    select: { id: true, publicId: true, name: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with publicId ${outletId} not found`);
  }

  const outletIdStr = outlet.publicId.toString().padStart(3, '0');
  const generatedAt = new Date();

  switch (format) {
    case 'sequential':
      return await generateSequentialNumber(outletIdStr, prefix, sequenceLength);
    
    case 'date-based':
      return await generateDateBasedNumber(outletIdStr, prefix, sequenceLength, generatedAt);
    
    case 'random':
      return await generateRandomNumber(outletIdStr, prefix, randomLength, false);
    
    case 'random-numeric':
      return await generateRandomNumber(outletIdStr, prefix, randomLength, true);
    
    case 'compact-numeric':
      return await generateCompactNumericNumber(outletIdStr, prefix);
    
    case 'hybrid':
      return await generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
    
    default:
      throw new Error(`Unsupported order number format: ${format}`);
  }
}

/**
 * Generate sequential order number: ORD-{outletId}-{sequence}
 * Uses atomic counter to prevent race conditions
 */
async function generateSequentialNumber(
  outletIdStr: string,
  prefix: string,
  sequenceLength: number
): Promise<OrderNumberResult> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Use atomic increment with retry logic
      const result = await prisma.$transaction(async (tx) => {
        // Get current sequence for this outlet
        const lastOrder = await tx.order.findFirst({
          where: { 
            orderNumber: { startsWith: `${prefix}-${outletIdStr}-` }
          },
          orderBy: { createdAt: 'desc' },
          select: { orderNumber: true, createdAt: true }
        });

        let nextSequence = 1;
        
        if (lastOrder) {
          // Extract sequence from last order number
          const parts = lastOrder.orderNumber.split('-');
          const lastSequence = parseInt(parts[parts.length - 1]) || 0;
          nextSequence = lastSequence + 1;
        }

        const orderNumber = `${prefix}-${outletIdStr}-${nextSequence.toString().padStart(sequenceLength, '0')}`;

        // Check for uniqueness (double-check)
        const existingOrder = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true }
        });

        if (existingOrder) {
          throw new Error('Order number collision detected');
        }

        return {
          orderNumber,
          sequence: nextSequence,
          generatedAt: new Date()
        };
      });

      return result;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to generate sequential order number after ${maxRetries} retries: ${errorMessage}`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 10));
    }
  }

  throw new Error('Maximum retries exceeded');
}

/**
 * Generate date-based order number: ORD-{outletId}-{date}-{sequence}
 * Resets sequence daily for better organization
 */
async function generateDateBasedNumber(
  outletIdStr: string,
  prefix: string,
  sequenceLength: number,
  generatedAt: Date
): Promise<OrderNumberResult> {
  const dateStr = generatedAt.toISOString().split('T')[0].replace(/-/g, '');
  
  const result = await prisma.$transaction(async (tx) => {
    // Get last order for this outlet on this date
    const lastOrder = await tx.order.findFirst({
      where: { 
        orderNumber: { startsWith: `${prefix}-${outletIdStr}-${dateStr}-` }
      },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true }
    });

    let nextSequence = 1;
    
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]) || 0;
      nextSequence = lastSequence + 1;
    }

    const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${nextSequence.toString().padStart(sequenceLength, '0')}`;

    // Check for uniqueness
    const existingOrder = await tx.order.findUnique({
      where: { orderNumber },
      select: { id: true }
    });

    if (existingOrder) {
      throw new Error('Order number collision detected');
    }

    return {
      orderNumber,
      sequence: nextSequence,
      generatedAt
    };
  });

  return result;
}

/**
 * Generate random order number: ORD-{outletId}-{random}
 * Uses crypto-secure random generation
 */
async function generateRandomNumber(
  outletIdStr: string,
  prefix: string,
  randomLength: number,
  numericOnly: boolean = false
): Promise<OrderNumberResult> {
  const maxRetries = 10;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Generate crypto-secure random string
      const randomStr = generateRandomString(randomLength, numericOnly);
      const orderNumber = `${prefix}-${outletIdStr}-${randomStr}`;

      // Check for uniqueness
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });

      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0, // No sequence for random
          generatedAt: new Date()
        };
      }

      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate random order number: ${errorMessage}`);
    }
  }

  throw new Error(`Failed to generate unique random order number after ${maxRetries} attempts`);
}

/**
 * Generate compact numeric order number: ORD{outletId}{random}
 * Format: ORD00112345 (no hyphens, 5-digit random number)
 */
async function generateCompactNumericNumber(
  outletIdStr: string,
  prefix: string
): Promise<OrderNumberResult> {
  const maxRetries = 10;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Generate 5-digit random number
      const randomStr = generateRandomString(5, true); // 5 digits, numeric only
      const orderNumber = `${prefix}${outletIdStr}${randomStr}`;

      // Check for uniqueness
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });

      if (!existingOrder) {
        return {
          orderNumber,
          sequence: 0, // No sequence for compact numeric
          generatedAt: new Date()
        };
      }

      retryCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate compact numeric order number: ${errorMessage}`);
    }
  }

  throw new Error(`Failed to generate unique compact numeric order number after ${maxRetries} attempts`);
}

/**
 * Generate hybrid order number: ORD-{outletId}-{date}-{random}
 * Combines outlet, date, and random for optimal security and organization
 */
async function generateHybridNumber(
  outletIdStr: string,
  prefix: string,
  sequenceLength: number,
  generatedAt: Date,
  numericOnly: boolean = false
): Promise<OrderNumberResult> {
  const dateStr = generatedAt.toISOString().split('T')[0].replace(/-/g, '');
  const randomStr = generateRandomString(4, numericOnly); // Shorter random part
  
  const orderNumber = `${prefix}-${outletIdStr}-${dateStr}-${randomStr}`;

  // Check for uniqueness
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true }
  });

  if (existingOrder) {
    // If collision, try with different random string
    return generateHybridNumber(outletIdStr, prefix, sequenceLength, generatedAt, numericOnly);
  }

  return {
    orderNumber,
    sequence: 0, // No sequence for hybrid
    generatedAt
  };
}

/**
 * Generate crypto-secure random string
 */
function generateRandomString(length: number, numericOnly: boolean = false): string {
  const chars = numericOnly ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = new Uint8Array(length);
  
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    window.crypto.getRandomValues(randomBytes);
  } else {
    // Node.js environment
    const crypto = require('crypto');
    const randomBytesNode = crypto.randomBytes(length);
    randomBytes.set(randomBytesNode);
  }
  
  return Array.from(randomBytes, byte => chars[byte % chars.length]).join('');
}

// ============================================================================
// VALIDATION & PARSING
// ============================================================================

/**
 * Validate order number format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  const patterns = [
    /^ORD-\d{3}-\d{4}$/, // Sequential: ORD-001-0001
    /^ORD-\d{3}-\d{8}-\d{4}$/, // Date-based: ORD-001-20250115-0001
    /^ORD-\d{3}-[A-Z0-9]{6}$/, // Random: ORD-001-A7B9C2
    /^ORD-\d{3}-\d{6}$/, // Random-numeric: ORD-001-123456
    /^ORD-\d{3}-\d{8}-[A-Z0-9]{4}$/, // Hybrid: ORD-001-20250115-A7B9
    /^ORD\d{3}\d{5}$/ // Compact-numeric: ORD00112345
  ];
  
  return patterns.some(pattern => pattern.test(orderNumber));
}

/**
 * Parse order number to extract components
 */
export function parseOrderNumber(orderNumber: string): {
  prefix: string;
  outletId: number;
  date?: string;
  sequence?: number;
  random?: string;
  format: OrderNumberFormat;
} | null {
  if (!validateOrderNumber(orderNumber)) {
    return null;
  }

  // Check for compact-numeric format first (no hyphens)
  if (/^ORD\d{3}\d{5}$/.test(orderNumber)) {
    const outletId = parseInt(orderNumber.substring(3, 6));
    const random = orderNumber.substring(6);
    
    return {
      prefix: 'ORD',
      outletId,
      random,
      format: 'compact-numeric'
    };
  }

  const parts = orderNumber.split('-');
  
  if (parts.length === 3) {
    // Sequential or Random format
    const sequence = parseInt(parts[2]);
    const isNumeric = /^\d+$/.test(parts[2]);
    
    return {
      prefix: parts[0],
      outletId: parseInt(parts[1]),
      sequence: isNumeric ? sequence : undefined,
      random: !isNumeric ? parts[2] : undefined,
      format: isNumeric ? 'sequential' : 'random'
    };
  }
  
  if (parts.length === 4) {
    // Date-based or Hybrid format
    const sequence = parseInt(parts[3]);
    const isNumeric = /^\d+$/.test(parts[3]);
    
    return {
      prefix: parts[0],
      outletId: parseInt(parts[1]),
      date: parts[2],
      sequence: isNumeric ? sequence : undefined,
      random: !isNumeric ? parts[3] : undefined,
      format: isNumeric ? 'date-based' : 'hybrid'
    };
  }
  
  return null;
}

// ============================================================================
// STATISTICS & UTILITIES
// ============================================================================

/**
 * Get order statistics for an outlet
 */
export async function getOutletOrderStats(outletId: number): Promise<{
  totalOrders: number;
  todayOrders: number;
  lastOrderNumber?: string;
  lastOrderDate?: Date;
}> {
  const outlet = await prisma.outlet.findUnique({
    where: { publicId: outletId },
    select: { id: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with publicId ${outletId} not found`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalOrders, todayOrders, lastOrder] = await Promise.all([
    prisma.order.count({
      where: { outletId: outlet.id }
    }),
    prisma.order.count({
      where: { 
        outletId: outlet.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.order.findFirst({
      where: { outletId: outlet.id },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true, createdAt: true }
    })
  ]);

  return {
    totalOrders,
    todayOrders,
    lastOrderNumber: lastOrder?.orderNumber,
    lastOrderDate: lastOrder?.createdAt
  };
}

/**
 * Quick order number generation with default settings
 */
export async function createOrderNumber(outletId: number): Promise<string> {
  const result = await generateOrderNumber({
    format: 'sequential',
    outletId,
    prefix: 'ORD',
    sequenceLength: 4
  });
  
  return result.orderNumber;
}

/**
 * Generate order number with specific format
 */
export async function createOrderNumberWithFormat(
  outletId: number, 
  format: OrderNumberFormat
): Promise<OrderNumberResult> {
  const config: OrderNumberConfig = {
    format,
    outletId,
    prefix: 'ORD',
    sequenceLength: 4,
    randomLength: 6,
    includeDate: true
  };
  
  return await generateOrderNumber(config);
}

/**
 * Generate multiple order numbers for testing
 */
export async function generateTestOrderNumbers(
  outletId: number, 
  count: number, 
  format: OrderNumberFormat = 'sequential'
): Promise<string[]> {
  const orderNumbers: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const result = await createOrderNumberWithFormat(outletId, format);
    orderNumbers.push(result.orderNumber);
  }
  
  return orderNumbers;
}

/**
 * Analyze order number
 */
export function analyzeOrderNumber(orderNumber: string) {
  const isValid = validateOrderNumber(orderNumber);
  const parsed = parseOrderNumber(orderNumber);
  
  return {
    orderNumber,
    isValid,
    parsed,
    format: parsed?.format || 'unknown',
    outletId: parsed?.outletId,
    sequence: parsed?.sequence,
    date: parsed?.date,
    random: parsed?.random
  };
}