'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  subscriptionsApi,
  lemonsqueezyApi,
  sepayApi,
  normalizeBillingInterval,
  amountToVndForSepayQr,
  type SepaySubscriptionTransferQrResponse,
} from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';
import { useToast } from '@rentalshop/ui';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  PageWrapper,
  Breadcrumb,
  PageLoadingIndicator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { 
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  Shield,
  History,
  MoreHorizontal,
  Landmark,
  Loader2,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import type { Subscription, Plan, Payment } from '@rentalshop/types';
import { useLocale, useTranslations } from 'next-intl';
import { USER_ROLE } from '@rentalshop/constants';
import { ChoosePlanDialog } from '../components/ChoosePlanDialog';
import { SePayVietQrPanel } from '../components/SePayVietQrPanel';

type RenewUiCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

function normalizedToRenewUiCycle(
  n: ReturnType<typeof normalizeBillingInterval>
): RenewUiCycle {
  if (n === 'quarterly') return 'quarterly';
  if (n === 'semi_annual') return 'semi_annual';
  if (n === 'annual') return 'annual';
  return 'monthly';
}

export default function MerchantSubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('subscription');
  const isVietnamCustomer = locale === 'vi';
  const contactPhone = '+840764774647';
  const { user, loading: authLoading } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChoosePlanDialog, setShowChoosePlanDialog] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState<Subscription[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [renewForm, setRenewForm] = useState({
    duration: 1,
    method: 'TRANSFER' as 'TRANSFER',
    transactionId: '',
    reference: '',
    description: '',
    paymentDate: '',
  });
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [urgentLemonLoading, setUrgentLemonLoading] = useState(false);
  const [sepayPublic, setSepayPublic] = useState<{
    vietQrEnabled: boolean;
    usdVndRate: number;
  } | null>(null);
  const [showSepayQrDialog, setShowSepayQrDialog] = useState(false);
  const [sepayUrgentLoading, setSepayUrgentLoading] = useState(false);
  const [sepayUrgentError, setSepayUrgentError] = useState<string | null>(null);
  const [sepayUrgentData, setSepayUrgentData] = useState<SepaySubscriptionTransferQrResponse | null>(null);

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatCurrency = (amount: number, currency: string = 'USD') =>
    new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);

  const billingLabelForInterval = (interval: string | undefined) => {
    const norm = normalizeBillingInterval(interval);
    const keyMap: Record<string, 'monthly' | 'quarterly' | 'semiAnnual' | 'annual'> = {
      monthly: 'monthly',
      quarterly: 'quarterly',
      semi_annual: 'semiAnnual',
      annual: 'annual',
    };
    const k = keyMap[norm] || 'monthly';
    return t(`billing.${k}`);
  };

  const mapStatusToTranslationKey = (status: string): string => {
    const u = status.toUpperCase();
    if (u === 'TRIAL' || u === 'TRIALING') return 'trialing';
    if (u === 'ACTIVE') return 'active';
    if (u === 'CANCELLED' || u === 'CANCELED') return 'canceled';
    if (u === 'EXPIRED') return 'expired';
    if (u === 'SUSPENDED') return 'suspended';
    if (u === 'PAST_DUE') return 'past_due';
    if (u === 'PAUSED') return 'paused';
    return 'unknown';
  };

  // Fetch subscription data
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      // Get current user's subscription status
      const result = await subscriptionsApi.getCurrentUserSubscriptionStatus();
      
      console.log('🔍 Subscription API response:', result);
      
      if (result.success && result.data) {
        // ============================================================================
        // NEW FLAT API RESPONSE - Map to Subscription object
        // ============================================================================
        const data = result.data;
        
        const subscriptionData: Subscription = {
          id: data.subscriptionId,
          merchantId: data.merchantId,
          planId: data.planId,
          status: data.status,
          amount: data.billingAmount,
          currency: data.billingCurrency,
          interval: data.billingInterval,
          intervalCount: data.billingIntervalCount,
          currentPeriodStart: data.currentPeriodStart,
          currentPeriodEnd: data.currentPeriodEnd,
          trialStart: data.trialStart,
          trialEnd: data.trialEnd,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
          canceledAt: data.canceledAt,
          cancelReason: data.cancelReason,
          createdAt: data.currentPeriodStart, // Use as fallback
          updatedAt: data.currentPeriodStart, // Use as fallback
          plan: {
            id: data.planId || 0,
            name: data.planName,
            description: data.planDescription || '',
            basePrice: data.planPrice,
            currency: data.planCurrency,
            trialDays: data.planTrialDays,
            isActive: true,
            features: data.features,
            limits: data.limits,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        } as any;
        
        console.log('✅ Mapped subscription data:', subscriptionData);
        setSubscription(subscriptionData);
        // Payments will be fetched separately if needed
        setPayments([]);
      } else {
        console.log('❌ No subscription data:', result);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // Error automatically handled by useGlobalErrorHandler
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role !== USER_ROLE.MERCHANT) {
      router.replace('/dashboard');
    }
  }, [authLoading, user?.id, user?.role, router]);

  useEffect(() => {
    if (authLoading || !user || user.role !== USER_ROLE.MERCHANT) return;
    fetchSubscription();
  }, [authLoading, user?.id, user?.role]);

  useEffect(() => {
    if (authLoading || !user || user.role !== USER_ROLE.MERCHANT) return;
    if (isVietnamCustomer) {
      setSepayPublic({ vietQrEnabled: false, usdVndRate: 25_000 });
      return;
    }
    void sepayApi.getPublicConfig().then((r) => {
      if (r.success && r.data) {
        setSepayPublic(r.data);
      } else {
        setSepayPublic({ vietQrEnabled: false, usdVndRate: 25_000 });
      }
    });
  }, [authLoading, user?.id, user?.role, isVietnamCustomer]);

  useEffect(() => {
    if (
      !showSepayQrDialog ||
      !subscription ||
      !sepayPublic?.vietQrEnabled ||
      isVietnamCustomer
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      setSepayUrgentLoading(true);
      setSepayUrgentError(null);
      const amountVnd = amountToVndForSepayQr(
        subscription.amount,
        subscription.plan?.currency,
        sepayPublic.usdVndRate
      );
      const res = await sepayApi.createSubscriptionTransferQr({
        amountVnd,
        planId: subscription.planId ?? subscription.plan?.id,
      });
      if (cancelled) return;
      if (res.success && res.data) {
        setSepayUrgentData(res.data);
      } else {
        setSepayUrgentError(
          typeof res.message === 'string' ? res.message : t('sepayVietQr.error')
        );
        setSepayUrgentData(null);
      }
      setSepayUrgentLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showSepayQrDialog,
    subscription?.id,
    subscription?.amount,
    subscription?.plan?.currency,
    subscription?.planId,
    subscription?.plan?.id,
    isVietnamCustomer,
    sepayPublic?.vietQrEnabled,
    sepayPublic?.usdVndRate,
    t,
  ]);

  // Deep links from dashboard banner: ?action=plans | ?action=renew
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) return;

    if (action === 'plans') {
      setShowChoosePlanDialog(true);
      router.replace('/subscription', { scroll: false });
      return;
    }

    if (action === 'renew') {
      if (subscription) {
        setShowRenewModal(true);
        router.replace('/subscription', { scroll: false });
      } else if (!loading) {
        router.replace('/subscription', { scroll: false });
      }
    }
  }, [searchParams, subscription, loading, router]);

  // Return from Lemon Squeezy checkout
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout) return;
    if (checkout === 'success') {
      toastSuccess(t('page.checkoutSuccessTitle'), t('page.checkoutSuccessBody'));
      void fetchSubscription();
    } else if (checkout === 'cancel') {
      toastInfo(t('page.checkoutCancelTitle'), t('page.checkoutCancelBody'));
    }
    router.replace('/subscription', { scroll: false });
  }, [searchParams, router, t]);

  const getStatusBadge = (status: string) => {
    const u = status.toUpperCase();
    const statusConfig: Record<
      string,
      { variant: 'outline' | 'solid' | 'default'; icon: typeof Clock }
    > = {
      TRIAL: { variant: 'outline', icon: Clock },
      ACTIVE: { variant: 'solid', icon: CheckCircle },
      CANCELLED: { variant: 'outline', icon: AlertTriangle },
      CANCELED: { variant: 'outline', icon: AlertTriangle },
      EXPIRED: { variant: 'outline', icon: AlertTriangle },
      SUSPENDED: { variant: 'outline', icon: AlertTriangle },
      PAST_DUE: { variant: 'outline', icon: AlertTriangle },
      PAUSED: { variant: 'outline', icon: Clock },
    };

    const config = statusConfig[u] || {
      variant: 'default' as const,
      icon: Clock,
    };
    const Icon = config.icon;
    const label = t(`status.${mapStatusToTranslationKey(status)}`);

    return (
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4" />
        <StatusBadge status={label} variant={config.variant} />
      </div>
    );
  };

  const isExpiringSoon = (endDate: string | Date | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (endDate: string | Date | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const getPlanFeatures = (plan: Plan) => {
    return plan.features || [];
  };

  const handleUpgrade = () => {
    setShowChoosePlanDialog(true);
  };

  const handleRenew = () => {
    setShowRenewModal(true);
  };

  /** Lemon Squeezy subscription checkout — same endpoint as “Choose plan” dialog. */
  const startLemonSqueezyCheckout = async (planId: number, interval: RenewUiCycle) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await lemonsqueezyApi.createSubscriptionCheckout({
      planId,
      billingInterval: interval,
      successUrl: `${origin}/subscription?checkout=success`,
      cancelUrl: `${origin}/subscription?checkout=cancel`,
    });
    if (res.success && res.data?.url) {
      window.location.assign(res.data.url);
      return;
    }
    const msg =
      typeof res.message === 'string' ? res.message : t('choosePlanDialog.checkoutErrorBody');
    toastError(t('choosePlanDialog.checkoutErrorTitle'), msg);
  };

  const handleBillingSettings = () => {
    setShowBillingModal(true);
  };

  const handleViewHistory = async () => {
    setShowHistoryModal(true);
    await fetchSubscriptionHistory();
  };

  const fetchSubscriptionHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await subscriptionsApi.getSubscriptionsPaginated(1, 50);
      if (result.success && result.data) {
        // Filter out current subscription and sort by date
        const history = (result.data.subscriptions || [])
          .filter((sub: Subscription) => sub.id !== subscription?.id)
          .sort((a: Subscription, b: Subscription) => {
            const dateA = a.currentPeriodEnd ? new Date(a.currentPeriodEnd).getTime() : 0;
            const dateB = b.currentPeriodEnd ? new Date(b.currentPeriodEnd).getTime() : 0;
            return dateB - dateA; // Most recent first
          });
        setSubscriptionHistory(history);
      }
    } catch (error) {
      console.error('Error fetching subscription history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Billing page is for merchant owners only (outlet staff/admin use dashboard without this UI)
  if (authLoading || !user) {
    return (
      <PageWrapper>
        <PageLoadingIndicator loading />
        <div className="py-12 text-center text-text-secondary">{t('page.loading')}</div>
      </PageWrapper>
    );
  }
  if (user.role !== USER_ROLE.MERCHANT) {
    return (
      <PageWrapper>
        <PageLoadingIndicator loading />
        <div className="py-12 text-center text-text-secondary">{t('page.loading')}</div>
      </PageWrapper>
    );
  }

  if (!subscription) {
    if (loading) {
      return (
        <PageWrapper>
          <PageLoadingIndicator loading />
          <div className="py-12 text-center text-text-secondary">{t('page.loading')}</div>
        </PageWrapper>
      );
    }

    return (
      <>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">{t('page.noSubscriptionTitle')}</h2>
          <p className="text-gray-600 mt-2">{t('page.noSubscriptionBody')}</p>
          <Button onClick={() => setShowChoosePlanDialog(true)} className="mt-4">
            <CreditCard className="h-4 w-4 mr-2" />
            {t('actions.choosePlan')}
          </Button>
        </div>
        <ChoosePlanDialog
          open={showChoosePlanDialog}
          onOpenChange={setShowChoosePlanDialog}
          currentPlanId={null}
        />
      </>
    );
  }

  return (
    <PageWrapper>
      {/* Page Loading Indicator - Floating, non-blocking */}
      <PageLoadingIndicator loading={loading} />
      <div className="space-y-6">
      {/* Header: one main action = payment / plans; rest in menu */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('mySubscription')}</h1>
          <p className="text-gray-600">{t('page.subtitleSimple')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" size="sm" onClick={handleUpgrade}>
            <CreditCard className="h-4 w-4 mr-2" />
            {t('flow.primaryPay')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                {t('flow.headerMore')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => void fetchSubscription()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('page.refresh')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleViewHistory()}>
                <History className="h-4 w-4 mr-2" />
                {t('page.viewHistory')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBillingSettings}>
                <Settings className="h-4 w-4 mr-2" />
                {t('page.billingSettings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRenew}>
                <Landmark className="h-4 w-4 mr-2" />
                {t('flow.bankTransferOnly')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Urgent: one primary pay + secondary links (process: card first, bank = proof) */}
      {(isExpiringSoon(subscription.currentPeriodEnd) || isExpired(subscription.currentPeriodEnd)) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h3 className="font-medium text-orange-900">
                    {isExpired(subscription.currentPeriodEnd)
                      ? t('page.alertExpiredTitle')
                      : t('page.alertExpiringTitle')}
                  </h3>
                  <p className="text-sm text-orange-800/90 mt-1">
                    {isExpired(subscription.currentPeriodEnd)
                      ? t('page.alertExpiredBody', {
                          date: formatDate(subscription.currentPeriodEnd!),
                        })
                      : t('page.alertExpiringBody', {
                          date: formatDate(subscription.currentPeriodEnd!),
                        })}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-white px-4 py-3">
                  <p className="text-xs text-muted-foreground">{t('flow.amountLabel')}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(subscription.amount, subscription.plan?.currency)}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {t('page.perBilling', {
                      interval: billingLabelForInterval(subscription.billingInterval),
                    })}
                  </p>
                </div>
                <Button
                  className="w-full sm:w-full max-w-md"
                  size="lg"
                  disabled={urgentLemonLoading || !(subscription.planId ?? subscription.plan?.id)}
                  onClick={async () => {
                    const pid = subscription.planId ?? subscription.plan?.id;
                    if (!pid) return;
                    setUrgentLemonLoading(true);
                    try {
                      await startLemonSqueezyCheckout(
                        pid,
                        normalizedToRenewUiCycle(
                          normalizeBillingInterval(subscription.billingInterval)
                        )
                      );
                    } finally {
                      setUrgentLemonLoading(false);
                    }
                  }}
                >
                  {urgentLemonLoading ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-5 w-5 mr-2" />
                  )}
                  {t('flow.payLemonCta', {
                    amount: formatCurrency(subscription.amount, subscription.plan?.currency),
                  })}
                </Button>
                {isVietnamCustomer ? (
                  <Button
                    variant="outline"
                    className="w-full sm:w-full max-w-md"
                    size="lg"
                    type="button"
                    onClick={() => window.open(`tel:${contactPhone}`, '_blank')}
                  >
                    <Landmark className="h-5 w-5 mr-2" />
                    {t('flow.contactManualCta')}
                  </Button>
                ) : (
                  sepayPublic?.vietQrEnabled && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-full max-w-md"
                      size="lg"
                      type="button"
                      onClick={() => setShowSepayQrDialog(true)}
                    >
                      <QrCode className="h-5 w-5 mr-2" />
                      {t('flow.paySepayCta')}
                    </Button>
                  )
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2 -ml-2 text-orange-900" onClick={handleUpgrade}>
                    {t('flow.urgentPickOtherPlan')}
                  </Button>
                  <span className="hidden sm:inline text-orange-300">·</span>
                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2 -ml-2 text-orange-900" onClick={handleRenew}>
                    {t('flow.urgentBankLink')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>{t('currentPlan')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{subscription.plan?.name}</h3>
                    <p className="text-gray-600">{subscription.plan?.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatCurrency(subscription.amount, subscription.plan?.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('page.perBilling', {
                        interval: billingLabelForInterval(subscription.billingInterval),
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(subscription.status)}
                  {isExpiringSoon(subscription.currentPeriodEnd) && (
                    <Badge variant="outline">{t('page.expiringSoonBadge')}</Badge>
                  )}
                  {isExpired(subscription.currentPeriodEnd) && (
                    <Badge variant="destructive">{t('page.expiredBadge')}</Badge>
                  )}
                </div>

                {/* Plan Features */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('features.title')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getPlanFeatures((subscription.plan as Plan) || ({ features: [] } as any)).map(
                      (feature: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{t('page.billingDetails')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-600">{t('page.startDate')}</Label>
                <p className="text-sm">{formatDate(subscription.currentPeriodStart)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">{t('page.endDate')}</Label>
                <p className="text-sm">
                  {subscription.currentPeriodEnd
                    ? formatDate(subscription.currentPeriodEnd)
                    : t('page.noEndDate')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">{t('page.nextBilling')}</Label>
                <p className="text-sm">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">{t('page.autoRenew')}</Label>
                <div className="flex items-center space-x-1">
                  {true ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">{t('page.yes')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{t('page.planLimits')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('usage.outlets')}</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.outlets === -1
                    ? t('features.unlimited')
                    : subscription.plan?.limits?.outlets || t('page.notSet')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('usage.users')}</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.users === -1
                    ? t('features.unlimited')
                    : subscription.plan?.limits?.users || t('page.notSet')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('usage.products')}</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.products === -1
                    ? t('features.unlimited')
                    : subscription.plan?.limits?.products || t('page.notSet')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('usage.customers')}</span>
                <span className="text-sm font-medium">
                  {subscription.plan?.limits?.customers === -1
                    ? t('features.unlimited')
                    : subscription.plan?.limits?.customers || t('page.notSet')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription History + Payment History modal (opened via "View history") */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('page.viewHistory')}
            </DialogTitle>
            <DialogDescription>{t('page.historyModalDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t('paymentHistory')}
              </h3>
              {payments.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm rounded-lg border border-dashed border-gray-200">
                  {t('page.noPaymentRecords')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('page.tableDate')}</TableHead>
                      <TableHead>{t('page.tableAmount')}</TableHead>
                      <TableHead>{t('page.tableMethod')}</TableHead>
                      <TableHead>{t('page.tableStatus')}</TableHead>
                      <TableHead>{t('page.tableReference')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount, subscription.plan?.currency || 'USD')}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={payment.status}
                            variant={
                              payment.status === 'COMPLETED'
                                ? 'solid'
                                : payment.status === 'FAILED'
                                  ? 'outline'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {(payment as any).reference || t('page.na')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">{t('page.historyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('page.historyDescription')}</p>
              {historyLoading ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto text-gray-400 animate-spin" />
                  <p className="text-gray-600 mt-2">{t('page.historyLoading')}</p>
                </div>
              ) : subscriptionHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">{t('page.historyEmpty')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('page.historyPlan')}</TableHead>
                      <TableHead>{t('page.tableStatus')}</TableHead>
                      <TableHead>{t('page.tableAmount')}</TableHead>
                      <TableHead>{t('page.historyPeriodStart')}</TableHead>
                      <TableHead>{t('page.historyPeriodEnd')}</TableHead>
                      <TableHead>{t('page.historyInterval')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionHistory.map((sub: Subscription) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.plan?.name || t('common.unknown')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(sub.status)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(sub.amount, sub.plan?.currency || 'USD')}
                        </TableCell>
                        <TableCell>
                          {sub.currentPeriodStart
                            ? formatDate(sub.currentPeriodStart)
                            : t('page.na')}
                        </TableCell>
                        <TableCell>
                          {sub.currentPeriodEnd
                            ? formatDate(sub.currentPeriodEnd)
                            : t('page.na')}
                        </TableCell>
                        <TableCell className="capitalize">
                          {sub.billingInterval
                            ? billingLabelForInterval(sub.billingInterval)
                            : t('page.na')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
              {t('bottomBar.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChoosePlanDialog
        open={showChoosePlanDialog}
        onOpenChange={setShowChoosePlanDialog}
        currentPlanId={subscription?.planId ?? subscription?.plan?.id ?? null}
        defaultBillingInterval={subscription?.billingInterval ?? null}
      />

      <Dialog
        open={showSepayQrDialog}
        onOpenChange={(open) => {
          setShowSepayQrDialog(open);
          if (!open) {
            setSepayUrgentData(null);
            setSepayUrgentError(null);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('flow.sepayQrDialogTitle')}</DialogTitle>
            <DialogDescription>{t('flow.sepayQrDialogDescription')}</DialogDescription>
          </DialogHeader>
          {sepayPublic?.vietQrEnabled ? (
            <SePayVietQrPanel
              loading={sepayUrgentLoading}
              errorMessage={sepayUrgentError}
              data={sepayUrgentData}
              usdVndRate={sepayPublic.usdVndRate}
              planCurrency={subscription.plan?.currency}
              showUsdConvertNote
              onSubmitProof={() => {
                setShowSepayQrDialog(false);
                setShowRenewModal(true);
              }}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSepayQrDialog(false)}>
              {t('bottomBar.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew / Extend Modal (manual transfer proof) */}
      <Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('page.renewModalTitle')}</DialogTitle>
            <DialogDescription>{t('page.renewModalBankOnly')}</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground -mt-2 mb-2">{t('page.transferHint')}</p>

          <div className="space-y-4">
            <div>
              <Label>{t('page.duration')}</Label>
              <Select
                value={String(renewForm.duration)}
                onValueChange={(v) => setRenewForm((p) => ({ ...p, duration: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('page.duration1m')}</SelectItem>
                  <SelectItem value="3">{t('page.duration3m')}</SelectItem>
                  <SelectItem value="6">{t('page.duration6m')}</SelectItem>
                  <SelectItem value="12">{t('page.duration12m')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('page.paymentMethod')}</Label>
              <Select value={renewForm.method} onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">{t('page.bankTransfer')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-text-secondary mt-1">
                {t('page.transferHint')}
              </p>
            </div>

            <div>
              <Label>{t('page.transactionId')}</Label>
              <Input
                value={renewForm.transactionId}
                onChange={(e) => setRenewForm((p) => ({ ...p, transactionId: e.target.value }))}
                placeholder={t('page.transactionPlaceholder')}
              />
            </div>

            <div>
              <Label>{t('page.referenceOptional')}</Label>
              <Input
                value={renewForm.reference}
                onChange={(e) => setRenewForm((p) => ({ ...p, reference: e.target.value }))}
                placeholder={t('page.referencePlaceholder')}
              />
            </div>

            <div>
              <Label>{t('page.paymentDateOptional')}</Label>
              <Input
                type="date"
                value={renewForm.paymentDate}
                onChange={(e) => setRenewForm((p) => ({ ...p, paymentDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>{t('page.descriptionOptional')}</Label>
              <Textarea
                value={renewForm.description}
                onChange={(e) => setRenewForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t('page.descriptionPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewModal(false)} disabled={renewSubmitting}>
              {t('modals.upgrade.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!subscription?.id) return;
                if (!renewForm.transactionId.trim()) {
                  toastError(t('page.toastMissingTxTitle'), t('page.toastMissingTxBody'));
                  return;
                }
                setRenewSubmitting(true);
                try {
                  const resp = await subscriptionsApi.renew(subscription.id, {
                    method: 'TRANSFER',
                    duration: renewForm.duration,
                    transactionId: renewForm.transactionId.trim(),
                    reference: renewForm.reference.trim() || undefined,
                    description: renewForm.description.trim() || undefined,
                    paymentDate: renewForm.paymentDate ? new Date(renewForm.paymentDate).toISOString() : undefined,
                  });
                  if (resp.success) {
                    toastSuccess(t('page.toastRenewSuccessTitle'), t('page.toastRenewSuccessBody'));
                    setShowRenewModal(false);
                    await fetchSubscription();
                  } else {
                    toastError(t('page.toastRenewFailedTitle'), resp.message || t('page.toastRenewFailedBody'));
                  }
                } catch (e) {
                  console.error(e);
                  toastError(t('page.toastRenewFailedTitle'), t('page.toastRenewFailedBody'));
                } finally {
                  setRenewSubmitting(false);
                }
              }}
              disabled={renewSubmitting || !subscription?.id}
            >
              {renewSubmitting ? t('page.submitting') : t('page.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Settings Modal */}
      <Dialog open={showBillingModal} onOpenChange={setShowBillingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('page.billingSettingsTitle')}</DialogTitle>
            <DialogDescription>
              {t('page.billingSettingsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('page.billingSettingsBody')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillingModal(false)}>
              {t('bottomBar.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageWrapper>
  );
}