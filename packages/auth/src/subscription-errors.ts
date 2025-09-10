/**
 * Subscription Error Handling Utilities
 * Provides consistent error handling for subscription-related issues
 */

export interface SubscriptionErrorResponse {
  success: false;
  error: string;
  status: number;
}

/**
 * Check if an error is a subscription-related error
 */
export function isSubscriptionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('subscription has been cancelled') ||
    message.includes('subscription has expired') ||
    message.includes('subscription has been suspended') ||
    message.includes('subscription payment is past due') ||
    message.includes('issue with your subscription')
  );
}

/**
 * Handle subscription errors consistently across API routes
 * Returns a proper error response for subscription issues
 */
export function handleSubscriptionError(error: unknown): SubscriptionErrorResponse {
  if (isSubscriptionError(error)) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Subscription error',
      status: 403 // Forbidden due to subscription issue
    };
  }
  
  // For non-subscription errors, return generic error
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
    status: 500
  };
}

/**
 * Get subscription status error message for a given status
 */
export function getSubscriptionStatusErrorMessage(status: string): string {
  const statusMessages: Record<string, string> = {
    'cancelled': 'Your subscription has been cancelled. Please contact support to reactivate your account.',
    'expired': 'Your subscription has expired. Please renew to continue using our services.',
    'suspended': 'Your subscription has been suspended. Please contact support for assistance.',
    'past_due': 'Your subscription payment is past due. Please update your payment method.'
  };
  
  return statusMessages[status.toLowerCase()] || 'There is an issue with your subscription. Please contact support.';
}
