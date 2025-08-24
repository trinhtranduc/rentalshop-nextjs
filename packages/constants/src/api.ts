/**
 * API and Network Constants
 * 
 * These constants define API behavior, endpoints, and network settings
 */

export const API = {
  // HTTP Status Codes
  STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
  
  // HTTP Methods
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
  },
  
  // Content Types
  CONTENT_TYPES: {
    JSON: 'application/json',
    FORM_DATA: 'multipart/form-data',
    TEXT: 'text/plain',
    HTML: 'text/html',
  },
  
  // Headers
  HEADERS: {
    AUTHORIZATION: 'Authorization',
    CONTENT_TYPE: 'Content-Type',
    ACCEPT: 'Accept',
    USER_AGENT: 'User-Agent',
    CACHE_CONTROL: 'Cache-Control',
  },
  
  // Rate Limiting
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
    BURST_LIMIT: 10,
  },
  
  // Timeouts
  TIMEOUTS: {
    CONNECT: 5000,
    READ: 30000,
    WRITE: 30000,
    IDLE: 60000,
  },
  
  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2,
  },
  
  // Cache Headers
  CACHE: {
    NO_CACHE: 'no-cache',
    NO_STORE: 'no-store',
    MUST_REVALIDATE: 'must-revalidate',
    PRIVATE: 'private',
    PUBLIC: 'public',
  },
  
  // Error Codes
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    CONFLICT_ERROR: 'CONFLICT_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
  },
} as const;

// Type for API values
export type ApiValue = typeof API[keyof typeof API];
