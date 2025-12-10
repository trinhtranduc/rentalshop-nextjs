/**
 * Validation and Business Rule Constants
 * 
 * These constants define validation rules and business logic limits
 */

export const VALIDATION = {
  // Rental Rules
  MIN_RENTAL_DAYS: 1,
  MAX_RENTAL_DAYS: 365,
  
  // Stock and Inventory
  LOW_STOCK_THRESHOLD: 2,
  CRITICAL_STOCK_THRESHOLD: 0,
  MAX_STOCK_QUANTITY: 9999,
  
  // User Input
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_EMAIL_LENGTH: 255,
  
  // Order Rules
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_AMOUNT: 999999.99,
  MAX_ORDER_ITEMS: 50,
  
  // Financial
  MIN_DEPOSIT_AMOUNT: 0,
  MAX_DEPOSIT_AMOUNT: 99999.99,
  MIN_DISCOUNT_AMOUNT: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  
  // File Uploads - Optimized sizes for web/mobile performance
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB (general upload limit)
  
  // Image size limits by type (optimized for performance)
  IMAGE_SIZES: {
    THUMBNAIL: 150 * 1024,      // 150KB - Small thumbnails, avatars
    PRODUCT: 200 * 1024,        // 200KB - Product images (recommended)
    PRODUCT_STRICT: 100 * 1024, // 300KB - Strict limit for mobile-first
    DOCUMENT: 2 * 1024 * 1024,  // 2MB - Documents, contracts
    MAX: 5 * 1024 * 1024,       // 5MB - Maximum allowed (rare cases)
  },
  
  // Image quality settings
  IMAGE_QUALITY: {
    THUMBNAIL: 70,   // Lower quality for small images
    PRODUCT: 75,     // Balanced quality for product images
    HIGH: 85,        // High quality for special cases
  },
  
  // Image dimensions (max width to maintain performance)
  IMAGE_DIMENSIONS: {
    THUMBNAIL: 300,   // 300px width
    PRODUCT: 1920,    // 1920px width (Full HD)
    PRODUCT_MOBILE: 800, // 800px for mobile-optimized
  },
  
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// Type for validation values
export type ValidationValue = typeof VALIDATION[keyof typeof VALIDATION];
