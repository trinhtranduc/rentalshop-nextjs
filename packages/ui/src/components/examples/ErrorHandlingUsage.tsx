'use client';

import React from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { useErrorHandler, useToasts } from '@rentalshop/hooks';

/**
 * Example showing how to use the error handling system with toast notifications
 * This demonstrates the three specific error scenarios you requested:
 * - 401: Authentication errors with login button
 * - 403: Permission errors with login button  
 * - Subscription/Plan errors with login button
 */
export const ErrorHandlingUsage: React.FC = () => {
  const { showErrorToast, login, retry } = useErrorHandler({
    onLogin: () => {
      // Redirect to login page
      window.location.href = '/login';
    },
    onRetry: () => {
      // Retry the operation
      console.log('Retrying operation...');
    }
  });

  const { toasts, removeToast } = useToasts();

  // Simulate the three specific error scenarios you mentioned
  const simulate401Error = () => {
    const authError = {
      status: 401,
      message: 'Unauthorized access - please log in again'
    };
    showErrorToast(authError);
  };

  const simulate403Error = () => {
    const permissionError = {
      status: 403,
      message: 'Insufficient permissions to perform this action'
    };
    showErrorToast(permissionError);
  };

  const simulateSubscriptionError = () => {
    const subscriptionError = {
      status: 402,
      message: 'Your subscription has expired or is insufficient for this action',
      errorCode: 'SUBSCRIPTION_EXPIRED'
    };
    showErrorToast(subscriptionError);
  };

  const simulateCancelledPlanError = () => {
    // This simulates the case where merchant cancels plan and APIs return "Invalid token"
    const cancelledPlanError = {
      status: 401,
      message: 'Invalid token',
      errorCode: 'SUBSCRIPTION_CANCELLED',
      context: 'subscription',
      subscriptionError: true
    };
    showErrorToast(cancelledPlanError);
  };

  const simulateNetworkError = () => {
    const networkError = {
      name: 'TypeError',
      message: 'Failed to fetch - check your connection'
    };
    showErrorToast(networkError);
  };

  const simulateValidationError = () => {
    const validationError = {
      status: 400,
      message: 'Validation failed: Email is required',
      errorCode: 'VALIDATION_ERROR'
    };
    showErrorToast(validationError);
  };

  return (
    <div className="space-y-4">
      {/* Toast Container */}

      {/* Demo Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handling with Toast Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Click the buttons below to simulate different error scenarios. Each error will show as a toast notification with appropriate styling and actions:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              onClick={simulate401Error}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              401 - Authentication Error
            </Button>
            
            <Button 
              onClick={simulate403Error}
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              403 - Permission Error
            </Button>
            
            <Button 
              onClick={simulateSubscriptionError}
              variant="outline"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              Subscription/Plan Error
            </Button>

            <Button 
              onClick={simulateCancelledPlanError}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancelled Plan "Invalid Token"
            </Button>

            <Button 
              onClick={simulateNetworkError}
              variant="outline"
              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
            >
              Network Error
            </Button>

            <Button 
              onClick={simulateValidationError}
              variant="outline"
              className="text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              Validation Error
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Error Handling Behavior:</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-1 space-y-1">
              <li>• <strong>401 Auth errors:</strong> Auto-redirect to login + toast with "log in again"</li>
              <li>• <strong>403 Permission errors:</strong> Toast only + "log in with different account"</li>
              <li>• <strong>Subscription errors:</strong> Toast only + "log in and upgrade your plan"</li>
              <li>• <strong>Cancelled plan "Invalid token":</strong> Correctly detected as subscription error</li>
              <li>• <strong>Network errors:</strong> Warning toast with retry options</li>
              <li>• <strong>Validation errors:</strong> Info toast for user guidance</li>
              <li>• <strong>Consistent styling:</strong> Uses the same toast system as the rest of the app</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorHandlingUsage;
