// ============================================================================
// BASE COMMON TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Base entity interface with common fields
 * All entities should extend this for consistency
 */
export interface BaseEntity {
  id: number;        // Auto-incrementing integer ID
  createdAt: Date | string; // Accept both Date objects and ISO strings from API
  updatedAt: Date | string; // Accept both Date objects and ISO strings from API
}

/**
 * Base entity with merchant relationship
 * Used for entities that belong to a merchant
 */
export interface BaseEntityWithMerchant extends BaseEntity {
  merchantId: number;
}

/**
 * Base entity with outlet relationship
 * Used for entities that belong to a specific outlet
 */
export interface BaseEntityWithOutlet extends BaseEntityWithMerchant {
  outletId: number;
}

/**
 * Soft delete interface
 * Used for entities that support soft deletion
 */
export interface SoftDelete {
  deletedAt?: Date | string;
  isDeleted: boolean;
}

/**
 * Timestamp interface for entities that only need time tracking
 */
export interface Timestamp {
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// ADDRESS TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Standardized address interface
 * Used across all entities that have address information
 */
export interface Address {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

/**
 * Contact information interface
 * Used for entities that have contact details
 */
export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
}

// ============================================================================
// PAGINATION TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Standard pagination parameters
 * Used across all search/filter operations
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Standard pagination metadata
 * Used in all paginated responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  hasMore: boolean; // Additional field for consistency
}

/**
 * Generic paginated result
 * Used for all paginated API responses
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// SEARCH TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Base search parameters
 * Common search fields used across entities
 */
export interface BaseSearchParams extends PaginationParams {
  search?: string;
  q?: string; // Alternative search parameter for consistency
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Base search result
 * Common structure for search responses
 */
export interface BaseSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// STATUS TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Common status values
 * Used across different entities
 */
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Common action types
 * Used for CRUD operations
 */
export type EntityAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate';

// ============================================================================
// RELATION TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Minimal merchant reference
 * Used when only basic merchant info is needed
 */
export interface MerchantReference {
  id: number;
  name: string;
  email?: string;
}

/**
 * Minimal outlet reference
 * Used when only basic outlet info is needed
 */
export interface OutletReference {
  id: number;
  name: string;
  address?: string;
  merchantId: number;
  merchant?: MerchantReference;
}

/**
 * Minimal user reference
 * Used when only basic user info is needed
 */
export interface UserReference {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Minimal customer reference
 * Used when only basic customer info is needed
 */
export interface CustomerReference {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email?: string;
  phone: string;
}

/**
 * Minimal product reference
 * Used when only basic product info is needed
 */
export interface ProductReference {
  id: number;
  name: string;
  rentPrice: number;
  deposit: number;
  available: number;
}

// ============================================================================
// FORM TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Base form input interface
 * Common fields for all form inputs
 */
export interface BaseFormInput {
  id?: number; // Optional for create operations
}

/**
 * Base update input interface
 * All update inputs should extend this
 */
export interface BaseUpdateInput {
  id: number; // Required for update operations
}

// ============================================================================
// API RESPONSE TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Standard API response wrapper
 * Used for all API responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

/**
 * Standard API error response
 * Used for error responses
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

// ============================================================================
// VALIDATION TYPES - DRY PRINCIPLES
// ============================================================================

/**
 * Validation error interface
 * Used for form validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation result interface
 * Used for validation responses
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}