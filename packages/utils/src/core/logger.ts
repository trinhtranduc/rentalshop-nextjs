/**
 * Logger Utility with Pino + Axiom
 * 
 * Features:
 * - File logging (combined.log, error.log) with rotation
 * - Console logging (pretty in dev, JSON in prod)
 * - Cloud logging to Axiom (optional, if credentials provided)
 * - Structured logging with context
 * - Server-only (uses Node.js modules: fs, worker_threads)
 * 
 * Usage:
 *   import { logError, logInfo, logWarn, logDebug } from '@rentalshop/utils/server';
 */

import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Get logs directory (works in monorepo structure)
function getLogsDir(): string {
  // Try to find project root by looking for package.json
  // Start from current file location (packages/utils/src/core)
  let currentDir = __dirname;
  
  // Navigate up from packages/utils/src/core to project root
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root, use current directory
      break;
    }
    currentDir = parentDir;
  }
  
  // Go up to project root (from packages/utils/src/core -> packages/utils -> packages -> root)
  const projectRoot = path.resolve(currentDir, '../../..');
  const logsDir = path.join(projectRoot, 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  return logsDir;
}

// Initialize Axiom client (optional)
let axiomClient: any = null;
if (process.env.AXIOM_TOKEN && process.env.AXIOM_ORG_ID) {
  try {
    // Dynamic import to avoid breaking if package is not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Axiom } = require('@axiomhq/js');
    axiomClient = new Axiom({
      token: process.env.AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG_ID,
    });
  } catch (error) {
    console.warn('Axiom client initialization failed:', error);
  }
}

// Configure Pino logger
const logsDir = getLogsDir();
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info');

// Build transports array for Pino v9
const transports: Array<{
  target: string;
  options?: any;
  level?: string;
}> = [];

// File logging with rotation (always enabled)
transports.push({
  target: 'pino-roll',
  options: {
    file: path.join(logsDir, 'combined.log'),
    frequency: 'daily',
    size: '10M',
    limit: 5, // Keep 5 files
  },
});

transports.push({
  target: 'pino-roll',
  options: {
    file: path.join(logsDir, 'error.log'),
    frequency: 'daily',
    size: '10M',
    limit: 5,
    levels: ['error'], // Only log errors
  },
  level: 'error',
});

// Console logging (pretty in dev, JSON in prod)
if (!isProduction) {
  transports.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  });
} else {
  // JSON format in production
  transports.push({
    target: 'pino/file',
    options: {
      destination: 1, // stdout
    },
  });
}

// Create Pino logger with transports
const logger = pino({
  level: logLevel,
  transport: {
    targets: transports,
  },
});

// Helper function to send logs to Axiom (if configured)
const sendToAxiom = async (level: string, message: string, data: Record<string, any>) => {
  if (!axiomClient) return;
  
  try {
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';
    const axiomDataset = process.env.AXIOM_DATASET || 
      (isProduction ? 'anyrent-logs-prod' : 'anyrent-logs-dev');
    const axiomLogLevel = process.env.AXIOM_LOG_LEVEL || (isProduction ? 'warn' : 'info');
    
    // Only send logs at or above configured level
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(axiomLogLevel);
    
    if (currentLevelIndex < minLevelIndex) {
      return; // Skip logs below configured level
    }
    
    await axiomClient.datasets.ingest(axiomDataset, [
      {
        _time: new Date().toISOString(),
        level,
        message,
        ...data,
        environment: process.env.NODE_ENV || 'development',
      },
    ]);
  } catch (error) {
    // Silent failure - don't break main operations
    // Only log to console to avoid infinite loop
    console.error('Failed to send log to Axiom:', error);
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

/**
 * Log API request/response
 */
export const logApiRequest = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: Record<string, any>
) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const logData = {
    method,
    path,
    statusCode,
    duration,
    ...context,
  };

  logger[level](logData, `API ${method} ${path} - ${statusCode} (${duration}ms)`);
  sendToAxiom(level, `API ${method} ${path} - ${statusCode} (${duration}ms)`, logData).catch(() => {});
};

/**
 * Log database operation
 */
export const logDatabaseOperation = (
  operation: string,
  model: string,
  duration: number,
  context?: Record<string, any>
) => {
  const level = duration > 1000 ? 'warn' : 'info';
  const logData = {
    operation,
    model,
    duration,
    ...context,
  };

  logger[level](logData, `DB ${operation} ${model} (${duration}ms)`);
  sendToAxiom(level, `DB ${operation} ${model} (${duration}ms)`, logData).catch(() => {});
};

// Export logger instance for advanced usage
export { logger };
