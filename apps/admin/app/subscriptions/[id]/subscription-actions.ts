/**
 * Which status actions the admin subscription detail page shows (#848).
 * Follows the API: Suspend = POST /pause (sets PAUSED), Resume = POST /resume (accepts PAUSED),
 * Cancel = POST /cancel. The API returns the status upper-case; compare without case.
 */
export interface SubscriptionActions {
  canSuspend: boolean;
  canCancel: boolean;
  canResume: boolean;
}

export function subscriptionActions(status: string | null | undefined): SubscriptionActions {
  const s = String(status ?? '').toUpperCase();
  return {
    canSuspend: s === 'ACTIVE',
    canCancel: s === 'ACTIVE' || s === 'TRIAL',
    canResume: s === 'PAUSED',
  };
}
