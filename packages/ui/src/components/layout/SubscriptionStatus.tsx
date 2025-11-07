'use client'

import React from 'react';
import { 
  Badge,
  StatusBadge,
  Button,
  Card,
  CardContent
} from '@rentalshop/ui/base';
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useSubscriptionStatusInfo } from '@rentalshop/hooks';

interface SubscriptionStatusProps {
  showDetails?: boolean;
  className?: string;
  currentUserRole?: string;
}

export function SubscriptionStatus({ showDetails = false, className = '', currentUserRole }: SubscriptionStatusProps) {
  const {
    hasSubscription,
    subscription,
    status,
    isTrial,
    isActive,
    isExpired,
    isExpiringSoon,
    daysUntilExpiry,
    planName,
    loading,
    error,
    statusMessage // Use statusReason from API
  } = useSubscriptionStatusInfo();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  if (error || !hasSubscription) {
    return (
      <div className={className}>
        {/* Only show "Get Started" button for ADMIN and MERCHANT roles */}
        {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/plans'}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Get Started
          </Button>
        )}
      </div>
    );
  }

  // ============================================================================
  // STATUS MAPPING (Based on computed status from API)
  // ============================================================================
  const getStatusIcon = () => {
    switch (status) {
      case 'TRIAL': return <Zap className="h-4 w-4" />;
      case 'ACTIVE': return <CheckCircle className="h-4 w-4" />;
      case 'EXPIRED': return <AlertTriangle className="h-4 w-4" />;
      case 'CANCELED': return <AlertTriangle className="h-4 w-4" />;
      case 'PAST_DUE': return <CreditCard className="h-4 w-4" />;
      case 'PAUSED': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'ACTIVE': return 'success' as const;
      case 'TRIAL': return 'warning' as const;
      case 'EXPIRED': return 'destructive' as const;
      case 'CANCELED': return 'destructive' as const;
      case 'PAST_DUE': return 'warning' as const;
      case 'PAUSED': return 'secondary' as const;
      default: return 'secondary' as const;
    }
  };

  const getStatusText = () => {
    // Use statusMessage from API (already has the reason)
    if (statusMessage) return statusMessage;
    
    // Fallback to status-based text
    switch (status) {
      case 'ACTIVE': return isExpiringSoon ? `Expires in ${daysUntilExpiry} days` : 'Active';
      case 'TRIAL': return `Trial (${daysUntilExpiry} days left)`;
      case 'EXPIRED': return 'Expired';
      case 'CANCELED': return 'Canceled';
      case 'PAST_DUE': return 'Payment Past Due';
      case 'PAUSED': return 'Paused';
      default: return status || 'Unknown';
    }
  };

  // Get border color based on status
  const getBorderColor = () => {
    switch (status) {
      case 'ACTIVE': return isExpiringSoon ? 'border-orange-500' : 'border-green-500';
      case 'TRIAL': return 'border-yellow-500';
      case 'EXPIRED': return 'border-red-500';
      case 'CANCELED': return 'border-red-500';
      case 'PAST_DUE': return 'border-orange-500';
      case 'PAUSED': return 'border-gray-500';
      default: return 'border-gray-500';
    }
  };

  // Check if action button should be shown
  const shouldShowAction = status === 'EXPIRED' || status === 'CANCELED' || status === 'PAST_DUE' || isExpiringSoon;

  if (showDetails) {
    return (
      <Card className={`border-l-4 ${getBorderColor()} ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <div className="font-medium text-gray-900">{planName}</div>
                <div className="text-sm text-gray-600">{getStatusText()}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge status={status} type="subscription" variant="solid">
              </StatusBadge>
              {/* Only show action buttons for ADMIN and MERCHANT roles */}
              {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && shouldShowAction && (
                <Button
                  size="sm"
                  onClick={() => window.location.href = '/plans'}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {status === 'EXPIRED' || status === 'CANCELED' ? 'Renew' : 'Upgrade'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <span className="font-medium">{planName} - {getStatusText()}</span>
      <StatusBadge status={status} type="subscription" variant="solid" size="sm" />
      {/* Only show action buttons for ADMIN and MERCHANT roles */}
      {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && shouldShowAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/plans'}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          {status === 'EXPIRED' || status === 'CANCELED' ? 'Renew' : 'Upgrade'}
        </Button>
      )}
    </div>
  );
}
