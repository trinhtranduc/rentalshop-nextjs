/**
 * Type declarations for @rentalshop/constants
 */

export interface BillingCycleOption {
  value: string;
  label: string;
  months: number;
  discount: number;
  description: string;
}

export interface PaginationConfig {
  defaultPageSize: number;
  maxPageSize: number;
  pageSizeOptions: number[];
}

export interface SearchConfig {
  minQueryLength: number;
  maxQueryLength: number;
  debounceMs: number;
}

export interface ValidationConfig {
  minPasswordLength: number;
  maxPasswordLength: number;
  minNameLength: number;
  maxNameLength: number;
  phoneRegex: RegExp;
  emailRegex: RegExp;
}

export interface UIConfig {
  animationDuration: number;
  transitionDuration: number;
  borderRadius: string;
  boxShadow: string;
}

export interface BusinessConfig {
  defaultCurrency: string;
  taxRate: number;
  maxRentalDays: number;
  minRentalDays: number;
}

export interface EnvironmentConfig {
  development: string;
  staging: string;
  production: string;
}

export interface APIConfig {
  STATUS: {
    OK: number;
    CREATED: number;
    NO_CONTENT: number;
    BAD_REQUEST: number;
    UNAUTHORIZED: number;
    FORBIDDEN: number;
    NOT_FOUND: number;
    CONFLICT: number;
    UNPROCESSABLE_ENTITY: number;
    INTERNAL_SERVER_ERROR: number;
    SERVICE_UNAVAILABLE: number;
  };
  METHODS: {
    GET: string;
    POST: string;
    PUT: string;
    PATCH: string;
    DELETE: string;
  };
  CONTENT_TYPES: {
    JSON: string;
    FORM_DATA: string;
    TEXT: string;
    HTML: string;
  };
  HEADERS: {
    AUTHORIZATION: string;
    CONTENT_TYPE: string;
    ACCEPT: string;
    USER_AGENT: string;
    CACHE_CONTROL: string;
  };
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: number;
    REQUESTS_PER_HOUR: number;
    BURST_LIMIT: number;
  };
  TIMEOUTS: {
    CONNECT: number;
    READ: number;
    WRITE: number;
    IDLE: number;
  };
  RETRY: {
    MAX_ATTEMPTS: number;
    INITIAL_DELAY: number;
    MAX_DELAY: number;
    BACKOFF_MULTIPLIER: number;
  };
  CACHE: {
    NO_CACHE: string;
    NO_STORE: string;
    MUST_REVALIDATE: string;
    PRIVATE: string;
    PUBLIC: string;
  };
  ERROR_CODES: {
    NETWORK_ERROR: string;
    TIMEOUT_ERROR: string;
    VALIDATION_ERROR: string;
    AUTHENTICATION_ERROR: string;
    AUTHORIZATION_ERROR: string;
    NOT_FOUND_ERROR: string;
    CONFLICT_ERROR: string;
    SERVER_ERROR: string;
  };
}

// Order constants
export const ORDER_STATUS_COLORS: Record<string, string>;
export const ORDER_TYPE_COLORS: Record<string, string>;
export const ORDER_STATUSES: string[];
export const ORDER_TYPES: string[];
export const ORDER_STATUS_LABELS: Record<string, string>;
export const ORDER_TYPE_LABELS: Record<string, string>;

// Billing cycle constants
export const BILLING_CYCLES: BillingCycleOption[];
export const BILLING_CYCLE_MAP: Record<string, BillingCycleOption>;

// Utility functions
export function getBillingCycleOption(value: string): BillingCycleOption | undefined;
export function getBillingCycleMonths(value: string): number;
export function getBillingCycleDiscount(value: string): number;
export function calculateDiscountedPrice(price: number, billingCycle: string): number;
export function formatBillingCycle(value: string): string;
export function getBillingCycleDescription(value: string): string;

// Configuration objects
export const PAGINATION: PaginationConfig;
export const SEARCH: SearchConfig;
export const VALIDATION: ValidationConfig;
export const UI: UIConfig;
export const BUSINESS: BusinessConfig;
export const ENVIRONMENT: EnvironmentConfig;
export const API: APIConfig;

// Main constants object
export const CONSTANTS: {
  PAGINATION: PaginationConfig;
  SEARCH: SearchConfig;
  VALIDATION: ValidationConfig;
  UI: UIConfig;
  BUSINESS: BusinessConfig;
  ENVIRONMENT: EnvironmentConfig;
  API: APIConfig;
  ORDERS: any;
  BILLING_CYCLES: any;
};

export default CONSTANTS;
