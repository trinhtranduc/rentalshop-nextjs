/**
 * Shared error handling utilities
 * Following DRY principles for consistent error responses
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  public details?: any;
  
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Create a standardized error response
 */
export const createErrorResponse = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      details: error.stack,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
  };
};

/**
 * Handle API errors consistently
 */
export const handleApiError = (error: unknown) => {
  console.error('API Error:', error);
  
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error && error.name === 'ZodError') {
    return {
      success: false,
      error: 'Validation error',
      details: error.message,
    };
  }

  return {
    success: false,
    error: 'Internal server error',
    details: error instanceof Error ? error.message : 'Unknown error',
  };
}; 