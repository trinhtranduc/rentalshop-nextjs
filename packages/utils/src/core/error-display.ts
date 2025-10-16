/**
 * Error Display Utilities
 * 
 * Utilities for displaying translated error messages in the UI.
 * This file provides helpers to convert API error responses into user-friendly translated messages.
 */

import { getErrorTranslationKey, isValidErrorCode } from './errors';
import type { ApiResponse } from '../api/response-builder';

/**
 * Get error message for display
 * 
 * This function extracts the error code from an API error response
 * and returns it so it can be translated client-side.
 * 
 * Usage with translation hook:
 * ```typescript
 * const te = useErrorTranslations();
 * const errorKey = getDisplayErrorKey(error);
 * const translatedMessage = te(errorKey);
 * ```
 * 
 * @param error - API error response or error object
 * @returns Error code to use as translation key
 */
export function getDisplayErrorKey(error: any): string {
  // Check if it's an API error response with error code
  if (error?.error && typeof error.error === 'string') {
    return error.error;
  }
  
  // Check if error code is in message
  if (error?.code && isValidErrorCode(error.code)) {
    return error.code;
  }
  
  // Fallback to unknown error
  return 'UNKNOWN_ERROR';
}

/**
 * Check if error has a translatable error code
 * 
 * @param error - Error object
 * @returns true if error has a valid error code
 */
export function hasTranslatableError(error: any): boolean {
  const errorKey = getDisplayErrorKey(error);
  return errorKey !== 'UNKNOWN_ERROR';
}

/**
 * Extract error details for additional context
 * 
 * @param error - Error object
 * @returns Error details string if available
 */
export function getErrorDetails(error: any): string | undefined {
  return error?.details || error?.message;
}

