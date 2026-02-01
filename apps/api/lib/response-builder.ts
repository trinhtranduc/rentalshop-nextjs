/**
 * Response Builder (Edge Runtime Safe)
 * 
 * Local copy of ResponseBuilder for middleware use.
 * IMPORTANT: This is a minimal version to avoid importing from @rentalshop/utils
 * which may pull in Prisma dependencies through barrel exports.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  error?: any;
}

/**
 * Minimal ResponseBuilder for Edge Runtime
 * Only includes methods needed by middleware
 */
export class ResponseBuilder {
  /**
   * Build error response
   */
  static error(code: string, message?: string): ApiResponse {
    return {
      success: false,
      code,
      message: message || this.getDefaultMessage(code),
      error: message || this.getDefaultMessage(code)
    };
  }

  /**
   * Build success response
   */
  static success<T>(code: string, data?: T): ApiResponse<T> {
    return {
      success: true,
      code,
      message: this.getDefaultMessage(code),
      data
    };
  }

  /**
   * Get default message for error code
   */
  private static getDefaultMessage(code: string): string {
    const messages: Record<string, string> = {
      'INSUFFICIENT_PERMISSIONS': 'Insufficient permissions',
      'UNAUTHORIZED': 'Unauthorized',
      'FORBIDDEN': 'Forbidden',
      'NOT_FOUND': 'Not found',
      'VALIDATION_ERROR': 'Validation error',
      'INTERNAL_ERROR': 'Internal server error'
    };
    
    return messages[code] || code;
  }
}
