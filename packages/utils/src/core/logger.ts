/**
 * Modern File Logger using Pino
 * 
 * Pino is the fastest and most modern logging library for Node.js:
 * - 5-10x faster than Winston
 * - JSON-based structured logging
 * - Zero dependencies (lightweight)
 * - Production-ready (used by Fastify, NestJS)
 * - 100% Free and open source
 * 
 * Features:
 * - Logs to files with automatic rotation
 * - Pretty console output in development
 * - JSON format for easy parsing
 * - Different log levels (error, warn, info, debug)
 * - Optional cloud integration (Axiom, Better Stack, etc.)
 */

import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Get logs directory - handle both Next.js and standalone execution
const getLogsDir = (): string => {
  const cwd = process.cwd();
  const possibleDirs = [
    path.join(cwd, 'logs'), // Current directory (apps/api/logs)
    path.join(cwd, '..', 'logs'), // Parent directory (workspace root/logs)
    path.join(cwd, '..', '..', 'logs'), // Workspace root if in packages/utils
  ];

  // Use first existing directory or create the first one
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  // Create logs directory in current working directory
  const logsDir = possibleDirs[0];
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
};

const logsDir = getLogsDir();

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create transports based on environment
const transports: Array<{
  target: string;
  level?: string;
  options?: Record<string, any>;
}> = [];

// File logging - always enabled
transports.push({
  target: 'pino/file',
  level: logLevel,
  options: {
    destination: path.join(logsDir, 'combined.log'),
    mkdir: true,
  },
});

// Error-only file logging
transports.push({
  target: 'pino/file',
  level: 'error',
  options: {
    destination: path.join(logsDir, 'error.log'),
    mkdir: true,
  },
});

// Pretty console output in development
if (process.env.NODE_ENV !== 'production') {
  transports.push({
    target: 'pino-pretty',
    level: logLevel,
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  });
}

// Axiom cloud logging (optional - only if credentials are provided)
if (process.env.AXIOM_TOKEN && process.env.AXIOM_ORG_ID) {
  try {
    // Use dynamic require to avoid breaking if package is not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const axiomTransport = require('@axiomhq/pino');
    
    // Determine environment for dataset selection
    // Priority: AXIOM_DATASET env var > auto-detect from NODE_ENV
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    
    // Auto-select dataset based on environment if not explicitly set
    // Development: rentalshop-logs-dev
    // Production: rentalshop-logs-prod
    // Or use AXIOM_DATASET if explicitly set
    const axiomDataset = process.env.AXIOM_DATASET || 
      (isProduction ? 'anyrent-logs-prod' : 'anyrent-logs-dev');
    
    // Determine log level for Axiom
    // Production: only warnings and errors to save quota
    // Development: info, warnings, and errors
    const axiomLogLevel = process.env.AXIOM_LOG_LEVEL || 
      (isProduction ? 'warn' : 'info');
    
    transports.push({
      target: '@axiomhq/pino',
      level: axiomLogLevel,
      options: {
        token: process.env.AXIOM_TOKEN,
        dataset: axiomDataset,
        orgId: process.env.AXIOM_ORG_ID,
      },
    });
  } catch (error) {
    // Silently fail if @axiomhq/pino is not installed
    // This allows the logger to work without Axiom
    // Only log warning in development to avoid noise
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Axiom transport not available. Install @axiomhq/pino to enable cloud logging.');
    }
  }
}

// Create logger instance
export const logger = pino(
  {
    level: logLevel,
    base: {
      service: 'rentalshop-api',
      environment: process.env.NODE_ENV || 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
  },
  pino.transport({
    targets: transports,
  })
);

// Helper functions for common logging patterns
export const logError = (message: string, error?: any, context?: Record<string, any>) => {
  const errorData = error instanceof Error
    ? {
        err: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }
    : error
    ? { err: error }
    : {};

  logger.error(
    {
      ...errorData,
      ...context,
    },
    message
  );
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(context || {}, message);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(context || {}, message);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(context || {}, message);
};

// API request/response logger
export const logApiRequest = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: {
    userId?: number;
    merchantId?: number;
    outletId?: number;
    ipAddress?: string;
    error?: any;
  }
) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const logData: Record<string, any> = {
    type: 'api_request',
    method,
    path,
    statusCode,
    duration,
    ...context,
  };

  if (context?.error) {
    logData.err = context.error instanceof Error
      ? {
          message: context.error.message,
          stack: context.error.stack,
          name: context.error.name,
        }
      : context.error;
  }

  logger[level](logData, `API ${method} ${path} - ${statusCode} (${duration}ms)`);
};

// Database operation logger
export const logDatabaseOperation = (
  operation: string,
  model: string,
  duration: number,
  context?: {
    success: boolean;
    error?: any;
    recordCount?: number;
  }
) => {
  const level = context?.error ? 'error' : 'debug';
  const logData: Record<string, any> = {
    type: 'database_operation',
    operation,
    model,
    duration,
    ...context,
  };

  if (context?.error) {
    logData.err = context.error instanceof Error
      ? {
          message: context.error.message,
          stack: context.error.stack,
          name: context.error.name,
        }
      : context.error;
  }

  logger[level](logData, `DB ${operation} ${model} (${duration}ms)`);
};

// Export default logger
export default logger;
