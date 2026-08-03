/**
 * Routes in this list authenticate inside their route handler instead of using
 * a user JWT in the global middleware.
 *
 * Keep this list explicit: adding `/api/cron` wholesale could accidentally
 * expose a future cron handler that forgot to validate CRON_SECRET.
 */
const ROUTE_MANAGED_AUTH_PATHS = new Set([
  '/api/cron/subscription-expiry-reminders',
  '/api/cron/loyalty-expire',
]);

export function usesRouteManagedAuth(pathname: string): boolean {
  return ROUTE_MANAGED_AUTH_PATHS.has(pathname);
}
