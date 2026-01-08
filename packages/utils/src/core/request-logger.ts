/**
 * Request Logger Utility
 * 
 * Simple utility to log API requests and responses to database
 * - Async logging (doesn't block requests)
 * - Sanitizes sensitive data (passwords, tokens)
 * - Error handling (silent failure to not break main operations)
 */

import { prisma } from '@rentalshop/database';

export interface RequestLogData {
  correlationId: string;
  method: string;
  path: string;
  queryParams?: Record<string, any>;
  requestBody?: any;
  responseBody?: any;
  statusCode: number;
  duration: number;
  userId?: number;
  merchantId?: number;
  outletId?: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

// Maximum body size to log (10KB)
const MAX_BODY_SIZE = 10 * 1024;

/**
 * Sanitize sensitive data from request/response bodies
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
  ];

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Check if field is sensitive
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Truncate string if too long
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '... [truncated]';
}

/**
 * Serialize data to JSON string with size limit
 */
function serializeData(data: any): string | null {
  if (data === undefined || data === null) {
    return null;
  }

  try {
    const sanitized = sanitizeData(data);
    const jsonString = JSON.stringify(sanitized);
    
    // Truncate if too large
    if (jsonString.length > MAX_BODY_SIZE) {
      return truncateString(jsonString, MAX_BODY_SIZE);
    }
    
    return jsonString;
  } catch (error) {
    // If serialization fails, return error message
    return `[Error serializing data: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Log a request to the database (async, non-blocking)
 */
export async function logRequest(data: RequestLogData): Promise<void> {
  try {
    // Don't await - fire and forget to not block the request
    // @ts-ignore - RequestLog model will be available after migration
    prisma.requestLog.create({
      data: {
        correlationId: data.correlationId,
        method: data.method,
        path: data.path,
        queryParams: data.queryParams ? serializeData(data.queryParams) : null,
        requestBody: data.requestBody ? serializeData(data.requestBody) : null,
        responseBody: data.responseBody ? serializeData(data.responseBody) : null,
        statusCode: data.statusCode,
        duration: data.duration,
        userId: data.userId || null,
        merchantId: data.merchantId || null,
        outletId: data.outletId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        errorMessage: data.errorMessage || null,
      },
    }).catch((error: unknown) => {
      // Silent failure - log error but don't throw
      console.error('Failed to log request:', error);
    });
  } catch (error: unknown) {
    // Silent failure - don't break main operations
    console.error('Request logger error:', error);
  }
}

/**
 * Generate a correlation ID
 * Format: req_YYYYMMDD_randomstring
 */
export function generateCorrelationId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 11);
  return `req_${dateStr}_${random}`;
}
