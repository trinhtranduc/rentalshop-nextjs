/**
 * Server-only utilities
 * 
 * This file exports utilities that should only be used on the server-side
 * (API routes, server components, etc.) and cannot be used in client-side code.
 * 
 * These utilities use Node.js modules that are not available in the browser:
 * - fs (file system)
 * - worker_threads
 * - pino (uses worker_threads)
 */

// File logger utilities (Pino) - SERVER ONLY
export * from './core/logger';
