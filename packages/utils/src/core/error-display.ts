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


/**
 * #740: the translation of an API error code, or null when there is none.
 *
 * next-intl does not return the code for a missing key: it returns `<namespace>.<code>` (for the errors
 * namespace, `errors.PLAN_UPGRADE_REQUIRED`). A check like `t(code) !== code` therefore takes that raw key for a
 * translation and shows it. This asks the message catalogue first (`t.has`), and for a translator without `has`
 * rejects both the code and the `<namespace>.<code>` form.
 *
 * @param t - the `useErrorTranslations()` function (or any next-intl translator)
 * @param code - the API error code
 */
export function lookupErrorTranslation(t: any, code: unknown): string | null {
  if (typeof code !== 'string' || !code) return null;
  try {
    if (typeof t?.has === 'function') {
      if (!t.has(code)) return null;
      const out = t(code);
      return typeof out === 'string' && out ? out : null;
    }
    const out = t(code);
    if (typeof out !== 'string' || !out) return null;
    if (out === code || out.endsWith(`.${code}`)) return null;
    return out;
  } catch {
    return null;
  }
}

/** True for text that is an API error code or a message key (`errors.X`, `SOME_CODE`) and not a sentence */
export function looksLikeErrorCode(text: unknown): boolean {
  return typeof text === 'string' && /^([a-z][A-Za-z]*\.)?[A-Z][A-Z0-9_]{2,}$/.test(text.trim());
}
