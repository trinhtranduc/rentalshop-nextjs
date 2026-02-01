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
import os from 'os';

// Get logs directory (works in monorepo structure)
function getLogsDir(): string | null {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // In production (Railway/Docker), skip file logging and use stdout only
  // File logging requires write permissions which may not be available
  if (isProduction) {
    return null; // Use stdout/stderr only in production
  }
  
  // Try to find project root by looking for package.json
  // Start from current file location (packages/utils/src/core)
  let currentDir = __dirname;
  
  // Navigate up from packages/utils/src/core to project root
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root, use temp directory as fallback
      return os.tmpdir();
    }
    currentDir = parentDir;
  }
  
  // Go up to project root (from packages/utils/src/core -> packages/utils -> packages -> root)
  const projectRoot = path.resolve(currentDir, '../../..');
  const logsDir = path.join(projectRoot, 'logs');
  
  // Create logs directory if it doesn't exist (with error handling)
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  } catch (error) {
    // If we can't create logs directory, fall back to temp directory
    console.warn('Failed to create logs directory, using temp directory:', error);
    return os.tmpdir();
  }
}

// Initialize Axiom client (optional)
let axiomClient: any = null;
let axiomInitError: string | null = null;
let axiomInitAttempted = false;

function initializeAxiomClient() {
  // Only initialize once
  if (axiomInitAttempted) {
    return;
  }
  axiomInitAttempted = true;

  const hasToken = !!process.env.AXIOM_TOKEN;
  const hasOrgId = !!process.env.AXIOM_ORG_ID;

  if (!hasToken || !hasOrgId) {
    axiomInitError = `AXIOM_TOKEN or AXIOM_ORG_ID not set. Token: ${hasToken ? 'set' : 'missing'}, OrgId: ${hasOrgId ? 'set' : 'missing'}`;
    console.log('ℹ️ Axiom logging disabled:', axiomInitError);
    return;
  }

  try {
    // Dynamic import to avoid breaking if package is not installed
    // Check if module exists before requiring
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const axiomModule = require('@axiomhq/js');
      if (axiomModule && axiomModule.Axiom) {
        axiomClient = new axiomModule.Axiom({
          token: process.env.AXIOM_TOKEN,
          orgId: process.env.AXIOM_ORG_ID,
        });
        const dataset = process.env.AXIOM_DATASET || (process.env.NODE_ENV === 'production' ? 'anyrent-logs-prod' : 'anyrent-logs-dev');
        console.log(`✅ Axiom client initialized successfully (dataset: ${dataset})`);
      } else {
        axiomInitError = 'Axiom class not found in @axiomhq/js module';
        console.warn('⚠️ Axiom client initialization failed:', axiomInitError);
      }
    } catch (requireError: any) {
      // Module not found or other require error
      if (requireError.code === 'MODULE_NOT_FOUND') {
        axiomInitError = `Module @axiomhq/js not found. Install with: yarn add @axiomhq/js. Error: ${requireError.message}`;
        console.error('❌ Axiom client initialization failed:', axiomInitError);
        console.error('💡 Make sure @axiomhq/js is installed in packages/utils/package.json and yarn install has been run');
      } else {
        axiomInitError = requireError.message || String(requireError);
        console.error('❌ Axiom client initialization failed:', axiomInitError);
      }
    }
  } catch (error) {
    // Catch any other errors during initialization
    axiomInitError = error instanceof Error ? error.message : String(error);
    console.error('❌ Axiom client initialization failed:', axiomInitError);
  }
}

// Initialize on module load
initializeAxiomClient();

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

// File logging with rotation (only in development, skip in production)
// Production environments (Railway/Docker) should use stdout/stderr only
if (logsDir && !isProduction) {
  try {
    transports.push({
      target: 'pino-roll',
      options: {
        file: path.join(logsDir, 'combined.log'),
        frequency: 'daily',
        size: '10M',
        limit: { count: 5 }, // Keep 5 files
      },
    });

    transports.push({
      target: 'pino-roll',
      options: {
        file: path.join(logsDir, 'error.log'),
        frequency: 'daily',
        size: '10M',
        limit: { count: 5 }, // Keep 5 files
        levels: ['error'], // Only log errors
      },
      level: 'error',
    });
  } catch (error) {
    // If file logging fails, continue with console logging only
    console.warn('File logging disabled due to error:', error);
  }
}

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

// Ensure at least one transport exists (fallback to stdout if all fail)
if (transports.length === 0) {
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
  // Try to initialize if not already attempted
  if (!axiomInitAttempted) {
    initializeAxiomClient();
  }

  if (!axiomClient) {
    // Only log once per session to avoid spam
    if (!axiomInitError || axiomInitError.includes('not set')) {
      return; // Silent skip if not configured
    }
    // Log error once if there was an initialization error (only for error level)
    if (level === 'error' && process.env.NODE_ENV === 'development') {
      console.debug('⚠️ Axiom client not available:', axiomInitError);
    }
    return;
  }
  
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
    
    const logEntry = {
      _time: new Date().toISOString(),
      level,
      message,
      ...data,
      environment: process.env.NODE_ENV || 'development',
      service: 'api',
      timestamp: Date.now(),
    };
    
    await axiomClient.datasets.ingest(axiomDataset, [logEntry]);
    
    // Log success in development for debugging
    if (process.env.NODE_ENV === 'development' && level === 'error') {
      console.debug(`✅ Log sent to Axiom (${level}):`, { dataset: axiomDataset, message });
    }
  } catch (error) {
    // Log error but don't break main operations
    // Only log to console to avoid infinite loop
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Always log Axiom errors to console (important for debugging)
    console.error('❌ Failed to send log to Axiom:', {
      error: errorMessage,
      level,
      message,
      dataset: process.env.AXIOM_DATASET || (process.env.NODE_ENV === 'production' ? 'anyrent-logs-prod' : 'anyrent-logs-dev'),
      ...(errorStack && { stack: errorStack }),
    });
    
    // In development, log full error for debugging
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error('Axiom error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        dataset: process.env.AXIOM_DATASET || 'anyrent-logs-dev',
        hasToken: !!process.env.AXIOM_TOKEN,
        hasOrgId: !!process.env.AXIOM_ORG_ID,
      });
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
