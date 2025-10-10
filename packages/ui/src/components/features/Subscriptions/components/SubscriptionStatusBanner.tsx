// ============================================================================
// SUBSCRIPTION STATUS BANNER COMPONENT
// ============================================================================

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../../ui/alert';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { 
  AlertTriangle, 
  CreditCard, 
  Download, 
  Clock, 
  Shield, 
  XCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useSubscriptionStatusInfo } from '@rentalshop/hooks';

interface SubscriptionStatusBannerProps {
  className?: string;
  showActions?: boolean;
  onUpgrade?: () => void;
  onPayment?: () => void;
  onExport?: () => void;
}

export function SubscriptionStatusBanner({
  className = '',
  showActions = true,
  onUpgrade,
  onPayment,
  onExport
}: SubscriptionStatusBannerProps) {
  const {
    statusMessage,
    statusColor,
    hasAccess,
    accessLevel,
    requiresPayment,
    upgradeRequired,
    gracePeriodEnds,
    canExportData,
    isRestricted,
    isReadOnly,
    isLimited,
    isDenied
  } = useSubscriptionStatusInfo();

  // Don't show banner if user has full access
  if (!isRestricted) {
    return null;
  }

  const getStatusIcon = () => {
    if (isDenied) return <XCircle className="w-5 h-5" />;
    if (isReadOnly) return <Shield className="w-5 h-5" />;
    if (isLimited) return <Clock className="w-5 h-5" />;
    if (requiresPayment) return <CreditCard className="w-5 h-5" />;
    if (upgradeRequired) return <AlertTriangle className="w-5 h-5" />;
    return <Info className="w-5 h-5" />;
  };

  const getStatusVariant = () => {
    switch (statusColor) {
      case 'red': return 'destructive';
      case 'orange': return 'default';
      case 'yellow': return 'default';
      case 'green': return 'default';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = () => {
    switch (accessLevel) {
      case 'denied': return 'destructive';
      case 'limited': return 'secondary';
      case 'readonly': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Alert className={`${className} ${getStatusVariant()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <AlertTitle className="flex items-center gap-2">
              Subscription Status
              <Badge variant={getStatusBadgeVariant()}>
                {accessLevel.toUpperCase()}
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-1">
              {statusMessage}
            </AlertDescription>
            
            {gracePeriodEnds && (
              <div className="mt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 inline mr-1" />
                Grace period ends: {gracePeriodEnds.toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex items-center space-x-2 ml-4">
            {upgradeRequired && onUpgrade && (
              <Button size="sm" onClick={onUpgrade}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Upgrade Now
              </Button>
            )}
            
            {requiresPayment && onPayment && (
              <Button size="sm" variant="outline" onClick={onPayment}>
                <CreditCard className="w-4 h-4 mr-1" />
                Make Payment
              </Button>
            )}
            
            {canExportData && onExport && (
              <Button size="sm" variant="outline" onClick={onExport}>
                <Download className="w-4 h-4 mr-1" />
                Export Data
              </Button>
            )}
          </div>
        )}
      </div>
    </Alert>
  );
}

interface SubscriptionStatusCardProps {
  className?: string;
  showActions?: boolean;
  onUpgrade?: () => void;
  onPayment?: () => void;
  onExport?: () => void;
}

export function SubscriptionStatusCard({
  className = '',
  showActions = true,
  onUpgrade,
  onPayment,
  onExport
}: SubscriptionStatusCardProps) {
  const {
    statusMessage,
    statusColor,
    hasAccess,
    accessLevel,
    requiresPayment,
    upgradeRequired,
    gracePeriodEnds,
    canExportData,
    isRestricted,
    isReadOnly,
    isLimited,
    isDenied
  } = useSubscriptionStatusInfo();

  // Don't show card if user has full access
  if (!isRestricted) {
    return null;
  }

  const getStatusIcon = () => {
    if (isDenied) return <XCircle className="w-6 h-6 text-red-500" />;
    if (isReadOnly) return <Shield className="w-6 h-6 text-yellow-500" />;
    if (isLimited) return <Clock className="w-6 h-6 text-orange-500" />;
    if (requiresPayment) return <CreditCard className="w-6 h-6 text-orange-500" />;
    if (upgradeRequired) return <AlertTriangle className="w-6 h-6 text-red-500" />;
    return <Info className="w-6 h-6 text-blue-500" />;
  };

  const getStatusColor = () => {
    switch (statusColor) {
      case 'red': return 'border-red-200 bg-red-50';
      case 'orange': return 'border-orange-200 bg-orange-50';
      case 'yellow': return 'border-yellow-200 bg-yellow-50';
      case 'green': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className={`${className} ${getStatusColor()}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {getStatusIcon()}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Subscription Status: {accessLevel.toUpperCase()}
              </h3>
              <p className="text-gray-700 mb-3">
                {statusMessage}
              </p>
              
              {gracePeriodEnds && (
                <div className="text-sm text-gray-600 mb-3">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Grace period ends: {gracePeriodEnds.toLocaleDateString()}
                </div>
              )}

              {showActions && (
                <div className="flex items-center space-x-3">
                  {upgradeRequired && onUpgrade && (
                    <Button size="sm" onClick={onUpgrade}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Upgrade Now
                    </Button>
                  )}
                  
                  {requiresPayment && onPayment && (
                    <Button size="sm" variant="outline" onClick={onPayment}>
                      <CreditCard className="w-4 h-4 mr-1" />
                      Make Payment
                    </Button>
                  )}
                  
                  {canExportData && onExport && (
                    <Button size="sm" variant="outline" onClick={onExport}>
                      <Download className="w-4 h-4 mr-1" />
                      Export Data
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
