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

// Axiom cloud logging using SDK directly (optional - only if credentials are provided)
// Using @axiomhq/js SDK instead of @axiomhq/pino to avoid worker_threads issues
let axiomClient: any = null;
if (process.env.AXIOM_TOKEN && process.env.AXIOM_ORG_ID) {
  try {
    // Use dynamic require to avoid breaking if package is not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('@axiomhq/js');
    
    axiomClient = new Client({
      token: process.env.AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG_ID,
    });
  } catch (error) {
    // Silently fail if @axiomhq/js is not installed
    // This allows the logger to work without Axiom
    // Only log warning in development to avoid noise
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Axiom SDK not available. Install @axiomhq/js to enable cloud logging.');
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

// Helper function to send logs to Axiom (if configured)
const sendToAxiom = async (level: string, message: string, data: Record<string, any>) => {
  if (!axiomClient) return;
  
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    const axiomDataset = process.env.AXIOM_DATASET || 
      (isProduction ? 'anyrent-logs-prod' : 'anyrent-logs-dev');
    const axiomLogLevel = process.env.AXIOM_LOG_LEVEL || 
      (isProduction ? 'warn' : 'info');
    
    // Only send if log level matches
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(axiomLogLevel);
    if (currentLevelIndex < minLevelIndex) return;
    
    await axiomClient.ingest(axiomDataset, [{
      _time: new Date().toISOString(),
      level,
      message,
      service: 'rentalshop-api',
      environment: nodeEnv,
      ...data,
    }]);
  } catch (error) {
    // Silently fail - don't break application if Axiom is down
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Failed to send log to Axiom:', error);
    }
  }
};

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

  const logData = {
    ...errorData,
    ...context,
  };

  logger.error(logData, message);
  
  // Send to Axiom asynchronously (don't await to avoid blocking)
  sendToAxiom('error', message, logData).catch(() => {});
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  const logData = context || {};
  logger.info(logData, message);
  sendToAxiom('info', message, logData).catch(() => {});
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  const logData = context || {};
  logger.warn(logData, message);
  sendToAxiom('warn', message, logData).catch(() => {});
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  const logData = context || {};
  logger.debug(logData, message);
  sendToAxiom('debug', message, logData).catch(() => {});
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
  sendToAxiom(level, `API ${method} ${path} - ${statusCode} (${duration}ms)`, logData).catch(() => {});
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
  sendToAxiom(level, `DB ${operation} ${model} (${duration}ms)`, logData).catch(() => {});
};

// Export default logger
export default logger;
