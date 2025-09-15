// ============================================================================
// SUBSCRIPTION ERROR BOUNDARY COMPONENT
// ============================================================================

import React, { useEffect } from 'react';
import { useSubscriptionError } from '@rentalshop/hooks';
import { SubscriptionStatusError } from './SubscriptionStatusError';

interface SubscriptionErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: any) => void;
  showErrorComponent?: boolean;
}

/**
 * Error boundary component that catches and handles subscription errors
 * Automatically displays subscription status errors when they occur
 */
export function SubscriptionErrorBoundary({
  children,
  onError,
  showErrorComponent = true
}: SubscriptionErrorBoundaryProps) {
  const { handleSubscriptionError, error, clearError } = useSubscriptionError();

  // Handle errors from props
  useEffect(() => {
    if (onError) {
      handleSubscriptionError(onError);
    }
  }, [onError, handleSubscriptionError]);

  return (
    <>
      {children}
      
      {/* Show subscription error component if error exists and showErrorComponent is true */}
      {showErrorComponent && error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <SubscriptionStatusError
              subscription={error.subscriptionStatus ? {
                status: error.subscriptionStatus,
                // Add other required fields with defaults
                id: 0,
                publicId: 0,
                merchantId: 0,
                planId: 0,
                status: error.subscriptionStatus,
                amount: 0,
                billingInterval: 'month',
                startDate: new Date(),
                endDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              } : null}
              onReactivate={() => {
                clearError();
                // Implement reactivate logic
                console.log('Reactivate subscription');
              }}
              onUpgrade={() => {
                clearError();
                // Implement upgrade logic
                console.log('Upgrade subscription');
              }}
              onContactSupport={() => {
                clearError();
                // Implement contact support logic
                console.log('Contact support');
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default SubscriptionErrorBoundary;
