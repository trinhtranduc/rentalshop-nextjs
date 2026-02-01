/**
 * Correlation ID Utility (Edge Runtime Safe)
 * 
 * This utility is safe to use in Edge Runtime (middleware) because it has no dependencies
 * on Node.js modules like Prisma or fs.
 */

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
