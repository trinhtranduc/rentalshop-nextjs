// ============================================================================
// SUBSCRIPTION STATUS BANNER COMPONENT
// ============================================================================

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../../ui/alert';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui/dropdown-menu';
import { 
  AlertTriangle, 
  CreditCard, 
  Download, 
  Clock, 
  Shield, 
  XCircle,
  CheckCircle,
  Info,
  Phone,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { useSubscriptionStatusInfo, useSubscriptionTranslations, useAuth } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils/client';
import { useLocale } from 'next-intl';

interface SubscriptionStatusBannerProps {
  className?: string;
  showActions?: boolean;
  onUpgrade?: () => void;
  onPayment?: () => void;
  onExport?: () => void;
  contactPhone?: string;
  dashboardLoaded?: boolean; // Only show after dashboard has finished loading
}

export function SubscriptionStatusBanner({
  className = '',
  showActions = true,
  onUpgrade,
  onPayment,
  onExport,
  contactPhone = '+840764774647',
  dashboardLoaded = true // Default to true for backward compatibility
}: SubscriptionStatusBannerProps) {
  const t = useSubscriptionTranslations();
  // Use centralized date formatting hook (DRY principle)
  const formatDate = useFormattedFullDate;
  const locale = useLocale();
  const { user } = useAuth();
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
    isDenied,
    isExpiringSoon,
    daysUntilExpiry,
    subscription,
    loading
  } = useSubscriptionStatusInfo();

  // Only show banner when:
  // 1. Dashboard has finished loading (to avoid flash)
  // 2. User is loaded (to avoid flash during auth)
  // 3. Not loading subscription data
  // 4. Have subscription data
  // 5. Subscription is expiring soon (<= 7 days)
  const hasSubscriptionData = subscription !== null && subscription !== undefined;
  const isExpiring = isExpiringSoon || (daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0);
  const shouldShow = dashboardLoaded && user && !loading && hasSubscriptionData && isExpiring;

  if (!shouldShow) {
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

  // Custom styling for expiring soon subscription (light orange/cream background)
  const isExpiringWarning = isExpiringSoon || (daysUntilExpiry !== null && daysUntilExpiry <= 7);

  return (
    <Alert 
      className={`${className} ${
        isExpiringWarning 
          ? 'bg-orange-50 border-orange-200 text-orange-800 [&>svg]:text-orange-600'
          : getStatusVariant()
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {isExpiringWarning ? (
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          ) : (
            getStatusIcon()
          )}
          <div className="flex-1">
            <AlertTitle className={`flex items-center gap-2 ${
              isExpiringWarning ? 'text-orange-800' : ''
            }`}>
              {isExpiringWarning ? t('banner.expiringSoon') : 'Subscription Status'}
              {!isExpiringWarning && (
              <Badge variant={getStatusBadgeVariant()}>
                {accessLevel.toUpperCase()}
              </Badge>
              )}
            </AlertTitle>
            <AlertDescription className={`mt-1 ${
              isExpiringWarning ? 'text-orange-700' : ''
            }`}>
              {isExpiringWarning && subscription?.currentPeriodEnd ? (
                t('banner.expiresOn', {
                  date: formatDate(subscription.currentPeriodEnd)
                })
              ) : isExpiringSoon && daysUntilExpiry !== null && daysUntilExpiry <= 1 ? (
                t('banner.expiresOn', {
                  date: formatDate(subscription?.currentPeriodEnd || new Date())
                })
              ) : (
                statusMessage
              )}
            </AlertDescription>
            
            {!isExpiringWarning && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 inline mr-1" />
                {daysUntilExpiry === 1 
                  ? 'Còn lại 1 ngày'
                  : `Còn lại ${daysUntilExpiry} ngày`
                }
              </div>
            )}
            
            {gracePeriodEnds && (
              <div className={`mt-2 text-sm ${
                isExpiringWarning ? 'text-orange-700' : 'text-muted-foreground'
              }`}>
                <Clock className="w-4 h-4 inline mr-1" />
                {t('banner.gracePeriodEnds', {
                  date: useFormattedFullDate(gracePeriodEnds)
                })}
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Phone className="w-4 h-4 mr-1" />
                  {t('banner.contact')}
                  <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    window.open(`tel:${contactPhone}`, '_blank');
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {t('banner.contactPhone')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    // Zalo: zalo://chat?phone=0764774647 (remove +84 and spaces)
                    const zaloPhone = contactPhone.replace(/[\s\+]/g, '').replace(/^84/, '');
                    window.open(`https://zalo.me/${zaloPhone}`, '_blank');
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('banner.contactZalo')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // WhatsApp: https://wa.me/840764774647 (remove + and spaces)
                    const whatsappPhone = contactPhone.replace(/[\s\+]/g, '');
                    window.open(`https://wa.me/${whatsappPhone}`, '_blank');
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('banner.contactWhatsApp')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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
  contactPhone?: string;
}

export function SubscriptionStatusCard({
  className = '',
  showActions = true,
  onUpgrade,
  onPayment,
  onExport,
  contactPhone = '+840764774647'
}: SubscriptionStatusCardProps) {
  const t = useSubscriptionTranslations();
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
                  Grace period ends: {formatDate(gracePeriodEnds)}
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
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-1" />
                        {t('banner.contact')}
                        <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          window.open(`tel:${contactPhone}`, '_blank');
                        }}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {t('banner.contactPhone')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          // Zalo: zalo://chat?phone=0764774647 (remove +84 and spaces)
                          const zaloPhone = contactPhone.replace(/[\s\+]/g, '').replace(/^84/, '');
                          window.open(`https://zalo.me/${zaloPhone}`, '_blank');
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {t('banner.contactZalo')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          // WhatsApp: https://wa.me/840764774647 (remove + and spaces)
                          const whatsappPhone = contactPhone.replace(/[\s\+]/g, '');
                          window.open(`https://wa.me/${whatsappPhone}`, '_blank');
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {t('banner.contactWhatsApp')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
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
