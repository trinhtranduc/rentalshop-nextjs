import type {
  User,
  Merchant,
  Outlet,
  Category,
  Product,
  Customer,
  Order,
  OrderItem,
  Payment,
} from '@prisma/client';

// ============================================================================
// DATABASE-SPECIFIC TYPES ONLY
// ============================================================================

// Constrained phone number type for database validation
export type PhoneNumber = string & { readonly __brand: 'PhoneNumber' };

// Helper function to validate and create phone numbers
export function createPhoneNumber(phone: string): PhoneNumber | null {
  if (phone.length < 8) return null;
  if (!/^[0-9+\-\s()]+$/.test(phone)) return null;
  return phone as PhoneNumber;
}

// Note: All business types have been moved to @rentalshop/types package

// Note: All product types have been moved to @rentalshop/types package

// Note: All order types have been moved to @rentalshop/types package 