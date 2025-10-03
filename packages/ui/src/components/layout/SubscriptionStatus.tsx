'use client'

import React from 'react';
import { 
  Badge,
  StatusBadge,
  Button,
  Card,
  CardContent
} from '../ui';
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
    error
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

  const getStatusIcon = () => {
    if (isTrial) return <Zap className="h-4 w-4" />;
    if (isActive) return <CheckCircle className="h-4 w-4" />;
    if (isExpired) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getStatusVariant = () => {
    if (isExpired) return 'destructive' as const;
    if (isExpiringSoon) return 'warning' as const;
    if (isActive) return 'success' as const;
    if (isTrial) return 'warning' as const;
    return 'secondary' as const;
  };

  const getStatusText = () => {
    if (isExpired) return 'Expired';
    if (isExpiringSoon) return `Expires in ${daysUntilExpiry} days`;
    if (isActive) return 'Active';
    if (isTrial) return `Trial (${daysUntilExpiry} days left)`;
    return status;
  };

  if (showDetails) {
    return (
      <Card className={`border-l-4 ${isExpired ? 'border-red-500' : isExpiringSoon ? 'border-orange-500' : 'border-green-500'} ${className}`}>
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
              <StatusBadge variant={getStatusVariant()}>
                {status}
              </StatusBadge>
              {/* Only show action buttons for ADMIN and MERCHANT roles */}
              {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (isExpired || isExpiringSoon) && (
                <Button
                  size="sm"
                  onClick={() => window.location.href = '/plans'}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {isExpired ? 'Renew' : 'Upgrade'}
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
      <StatusBadge variant={getStatusVariant()}>
        {planName} - {getStatusText()}
      </StatusBadge>
      {/* Only show action buttons for ADMIN and MERCHANT roles */}
      {(currentUserRole === 'ADMIN' || currentUserRole === 'MERCHANT') && (isExpired || isExpiringSoon) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/plans'}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          {isExpired ? 'Renew' : 'Upgrade'}
        </Button>
      )}
    </div>
  );
}
