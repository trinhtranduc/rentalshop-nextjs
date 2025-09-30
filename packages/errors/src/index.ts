import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const createErrorResponse = (
  error: unknown,
  fallbackMessage = 'Internal server error'
) => {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, message: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { success: false, message: fallbackMessage },
    { status: 500 }
  );
};

export const notFound = (resource: string) => 
  new ApiError(404, `${resource} not found`, 'NOT_FOUND');

export const badRequest = (message: string) => 
  new ApiError(400, message, 'BAD_REQUEST');

export const unauthorized = () => 
  new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');

export const forbidden = () => 
  new ApiError(403, 'Forbidden', 'FORBIDDEN');