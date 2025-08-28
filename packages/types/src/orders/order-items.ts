// ============================================================================
// ORDER ITEMS TYPES
// ============================================================================

export interface OrderItem {
  id: string;           // Database CUID (internal use)
  publicId: number;     // Public numeric ID (external use)
  orderId: string;      // Database CUID
  productId: string;    // Database CUID
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemInput {
  productId: number;    // Frontend sends publicId (number)
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalDays?: number;
  startDate?: Date;
  endDate?: Date;
  daysRented?: number;
  deposit?: number;
  notes?: string;
}

export interface OrderItemWithProduct extends Omit<OrderItem, 'createdAt' | 'updatedAt'> {
  product: {
    id: string;         // Database CUID (internal use)
    publicId: number;   // Public numeric ID (external use)
    name: string;
    barcode?: string;
    description?: string;
  };
}

// ============================================================================
// UNIFIED ORDER ITEM TYPE FOR FORMS (CREATE + EDIT)
// ============================================================================

/**
 * Unified OrderItemFormData - Works for both creating and editing orders
 * 
 * This type handles the dual ID system properly:
 * - Frontend always works with publicIds (numbers)
 * - Database operations use CUIDs (strings)
 * - Form components can be reused between create and edit modes
 */
export interface OrderItemFormData {
  // For existing items (edit mode)
  id?: string;          // Database CUID (only present when editing existing items)
  
  // Product information
  productId: number;    // Frontend uses publicId (number) for product selection
  product: {
    id: number;         // Frontend uses publicId (number) for display
    publicId: number;   // Keep publicId for reference
    name: string;
    description?: string;
    images?: string[] | null;
    barcode?: string;
    rentPrice?: number;
    deposit?: number;
  };
  
  // Order item details
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalDays?: number;
  deposit?: number;
  notes?: string;
  
  // Rental-specific fields
  startDate?: string;   // ISO date string for form inputs
  endDate?: string;     // ISO date string for form inputs
  daysRented?: number;
}

/**
 * OrderItemFormData for API operations
 * 
 * This type is used when sending data to the API:
 * - Converts frontend numbers to database CUIDs
 * - Handles both create and update operations
 */
export interface OrderItemApiData {
  id?: string;          // Database CUID (for updates)
  productId: string;    // Database CUID (converted from frontend publicId)
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalDays?: number;
  deposit?: number;
  notes?: string;
}

/**
 * OrderItemFormData for display purposes
 * 
 * This type is used when displaying order items in forms:
 * - Always uses publicIds (numbers) for frontend compatibility
 * - Includes all necessary product information
 * - Works seamlessly with form components
 */
export interface OrderItemDisplayData {
  id?: string;          // Database CUID (for existing items)
  productId: number;    // Public ID for frontend
  product: {
    id: number;         // Public ID for frontend
    name: string;
    description?: string;
    images?: string[] | null;
    barcode?: string;
    rentPrice?: number;
    deposit?: number;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rentalDays?: number;
  deposit?: number;
  notes?: string;
}
