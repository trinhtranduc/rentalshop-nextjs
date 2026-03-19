// ============================================================================
// SUBSCRIPTION STATUS BANNER COMPONENT
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ChevronDown,
  X
} from 'lucide-react';
import { useSubscriptionStatusInfo, useSubscriptionTranslations, useAuth } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils/client';
const SUBSCRIPTION_DASHBOARD_BANNER_DISMISS_KEY = 'rentalshop.subscriptionDashboardBanner.dismissed';

interface SubscriptionStatusBannerProps {
  className?: string;
  showActions?: boolean;
  /** Show close control; dismissal is remembered until subscription fingerprint changes (localStorage) */
  dismissible?: boolean;
  onUpgrade?: () => void;
  onPayment?: () => void;
  onExport?: () => void;
  contactPhone?: string;
  dashboardLoaded?: boolean; // Only show after dashboard has finished loading
}

export function SubscriptionStatusBanner({
  className = '',
  showActions = true,
  dismissible = true,
  onUpgrade,
  onPayment,
  onExport,
  contactPhone = '+840764774647',
  dashboardLoaded = true // Default to true for backward compatibility
}: SubscriptionStatusBannerProps) {
  const t = useSubscriptionTranslations();
  // Use centralized date formatting hook (DRY principle)
  const formatDate = useFormattedFullDate;
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
    isExpired,
    daysUntilExpiry,
    subscription,
    loading
  } = useSubscriptionStatusInfo();

  const hasSubscriptionData = subscription !== null && subscription !== undefined;

  /** Fingerprint: dismiss resets when merchant / subscription / period / status changes */
  const dismissFingerprint = useMemo(() => {
    if (!user?.merchantId || !subscription) return '';
    const subId = subscription.subscriptionId ?? subscription.id;
    const periodEnd = subscription.currentPeriodEnd ?? '';
    const st = subscription.status ?? '';
    return `${user.merchantId}:${subId}:${periodEnd}:${st}`;
  }, [user?.merchantId, subscription]);

  const [userDismissed, setUserDismissed] = useState(false);

  useEffect(() => {
    if (!dismissFingerprint || typeof window === 'undefined') return;
    try {
      setUserDismissed(localStorage.getItem(SUBSCRIPTION_DASHBOARD_BANNER_DISMISS_KEY) === dismissFingerprint);
    } catch {
      setUserDismissed(false);
    }
  }, [dismissFingerprint]);

  const handleDismiss = useCallback(() => {
    if (!dismissFingerprint || typeof window === 'undefined') return;
    try {
      localStorage.setItem(SUBSCRIPTION_DASHBOARD_BANNER_DISMISS_KEY, dismissFingerprint);
    } catch {
      /* ignore */
    }
    setUserDismissed(true);
  }, [dismissFingerprint]);

  // Attention: no access, expired, expiring soon, or <= 7 days left (with subscription row)
  const needsAttention =
    hasSubscriptionData &&
    (!hasAccess ||
      isExpired ||
      isExpiringSoon ||
      (daysUntilExpiry !== null && daysUntilExpiry <= 7));

  const shouldShow =
    dashboardLoaded && user && !loading && needsAttention && !(dismissible && userDismissed);

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

  // Custom styling for expiring soon, expired, or no access (light orange/cream background)
  const isExpiringWarning =
    !hasAccess || isExpired || isExpiringSoon || (daysUntilExpiry !== null && daysUntilExpiry <= 7);

  return (
    <Alert 
      className={`relative pr-10 ${className} ${
        isExpiringWarning 
          ? 'bg-orange-50 border-orange-200 text-orange-800 [&>svg]:text-orange-600'
          : getStatusVariant()
      }`}
    >
      {dismissible && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`absolute right-2 top-2 h-8 w-8 shrink-0 ${
            isExpiringWarning
              ? 'text-orange-800 hover:bg-orange-100/80 hover:text-orange-950'
              : 'text-muted-foreground hover:bg-muted'
          }`}
          onClick={handleDismiss}
          aria-label={t('banner.dismissAria')}
          title={t('banner.dismiss')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start space-x-3">
          {isExpiringWarning ? (
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          ) : (
            getStatusIcon()
          )}
          <div className="flex-1">
            <AlertTitle className={`flex items-center gap-2 ${
              isExpiringWarning ? 'text-orange-800' : ''
            }`}>
              {isExpired
                ? t('banner.expiredTitle')
                : !hasAccess
                  ? t('bottomBar.title')
                : isExpiringSoon || (daysUntilExpiry !== null && daysUntilExpiry <= 7)
                  ? t('banner.expiringSoon')
                  : t('banner.subscriptionStatus')}
              {!isExpiringWarning && (
              <Badge variant={getStatusBadgeVariant()}>
                {t(`accessLevels.${accessLevel}` as 'accessLevels.full')}
              </Badge>
              )}
            </AlertTitle>
            <AlertDescription className={`mt-1 ${
              isExpiringWarning ? 'text-orange-700' : ''
            }`}>
              {isExpired ? (
                t('banner.expiredMessage')
              ) : !hasAccess ? (
                statusMessage || t('errors.generic')
              ) : isExpiringWarning && subscription?.currentPeriodEnd ? (
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
                  ? t('expiringSoon.oneDayLeft')
                  : t('expiringSoon.daysLeft', { days: daysUntilExpiry ?? 0 })}
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
          <div className="flex flex-wrap items-center justify-end gap-2 ml-4 shrink-0">
            {/* Primary: open subscription page (renew / overview). Secondary: jump straight to plan picker. */}
            {onPayment && (
              <Button size="sm" variant="default" onClick={onPayment}>
                <CreditCard className="h-4 w-4 mr-1" />
                {t('banner.ctaManageBilling')}
              </Button>
            )}
            {onUpgrade && (
              <Button size="sm" variant="outline" onClick={onUpgrade}>
                {upgradeRequired ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {t('actions.upgradeNow')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t('banner.ctaComparePlans')}
                  </>
                )}
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
                {t('actions.exportData')}
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
  const formatDate = useFormattedFullDate;
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
                {t('banner.subscriptionStatus')}:{' '}
                {t(`accessLevels.${accessLevel}` as 'accessLevels.full')}
              </h3>
              <p className="text-gray-700 mb-3">
                {statusMessage}
              </p>
              
              {gracePeriodEnds && (
                <div className="text-sm text-gray-600 mb-3">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {t('banner.gracePeriodEnds', {
                    date: formatDate(gracePeriodEnds),
                  })}
                </div>
              )}

              {showActions && (
                <div className="flex flex-wrap items-center gap-2">
                  {onPayment && (
                    <Button size="sm" variant="default" onClick={onPayment}>
                      <CreditCard className="h-4 w-4 mr-1" />
                      {t('banner.ctaManageBilling')}
                    </Button>
                  )}
                  {onUpgrade && (
                    <Button size="sm" variant="outline" onClick={onUpgrade}>
                      {upgradeRequired ? (
                        <>
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {t('actions.upgradeNow')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('banner.ctaComparePlans')}
                        </>
                      )}
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
                      <Download className="h-4 w-4 mr-1" />
                      {t('actions.exportData')}
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
