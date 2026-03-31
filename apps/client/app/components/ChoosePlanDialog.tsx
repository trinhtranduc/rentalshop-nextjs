'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  plansApi,
  lemonsqueezyApi,
  sepayApi,
  normalizeBillingInterval,
  amountToVndForSepayQr,
  type SepaySubscriptionTransferQrResponse,
} from '@rentalshop/utils';
import { SePayVietQrPanel } from './SePayVietQrPanel';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
} from '@rentalshop/ui';
import {
  CreditCard,
  CheckCircle,
  Star,
  Zap,
  Shield,
  Building,
  Package,
  ArrowRight,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { Plan } from '@rentalshop/types';
import { useLocale, useTranslations } from 'next-intl';

/** UI billing cycle values — passed to API (normalizeBillingInterval accepts these). */
type UiBillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

function subscriptionIntervalToUiCycle(interval?: string | null): UiBillingCycle {
  const n = normalizeBillingInterval(interval);
  if (n === 'quarterly') return 'quarterly';
  if (n === 'semi_annual') return 'semi_annual';
  if (n === 'annual') return 'annual';
  return 'monthly';
}

function computeEstimatedTotal(basePrice: number, cycle: UiBillingCycle): number {
  switch (cycle) {
    case 'monthly':
      return basePrice;
    case 'quarterly':
      return basePrice * 3;
    case 'semi_annual':
      return basePrice * 6;
    case 'annual':
      return basePrice * 12 * 0.9;
    default:
      return basePrice;
  }
}

export interface ChoosePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Highlight plan matching current subscription (public id) */
  currentPlanId?: number | null;
  /** Pre-select billing cycle from active subscription (renew / upgrade) */
  defaultBillingInterval?: string | null;
  /** Where Lemon Squeezy should redirect after checkout. */
  checkoutReturnPath?: string;
}

export function ChoosePlanDialog({
  open,
  onOpenChange,
  currentPlanId,
  defaultBillingInterval,
  checkoutReturnPath = '/subscription',
}: ChoosePlanDialogProps) {
  const locale = useLocale();
  const t = useTranslations('subscription.choosePlanDialog');
  const isVietnamCustomer = locale === 'vi';
  const contactPhone = '+840764774647';
  const { toastError } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<UiBillingCycle>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [sepayPublic, setSepayPublic] = useState<{
    vietQrEnabled: boolean;
    usdVndRate: number;
  } | null>(null);
  const [paymentTab, setPaymentTab] = useState<'lemon' | 'sepay'>('lemon');
  const [sepayQrLoading, setSepayQrLoading] = useState(false);
  const [sepayQrError, setSepayQrError] = useState<string | null>(null);
  const [sepayQrData, setSepayQrData] = useState<SepaySubscriptionTransferQrResponse | null>(null);

  const formatCurrency = useCallback(
    (amount: number, currency: string = 'USD') =>
      new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency,
      }).format(amount),
    [locale]
  );

  const getPlanFeatures = (plan: Plan): string[] => {
    if (Array.isArray(plan.features)) return plan.features as string[];
    try {
      return JSON.parse((plan.features as unknown as string) || '[]');
    } catch {
      return [];
    }
  };

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await plansApi.getPlans({ limit: 50, page: 1 });
      if (res.success && res.data?.plans) {
        setPlans(res.data.plans);
      } else {
        setLoadError(true);
        setPlans([]);
      }
    } catch {
      setLoadError(true);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedPlan(null);
      setCheckoutLoading(false);
      setBillingCycle(subscriptionIntervalToUiCycle(defaultBillingInterval));
      setPaymentTab('lemon');
      setSepayQrData(null);
      setSepayQrError(null);
      setSepayQrLoading(false);
      void loadPlans();
      // For Vietnamese customers we intentionally hide SePay and guide via manual transfer.
      if (isVietnamCustomer) {
        setSepayPublic({ vietQrEnabled: false, usdVndRate: 25_000 });
      } else {
        void sepayApi.getPublicConfig().then((r) => {
          if (r.success && r.data) {
            setSepayPublic(r.data);
          } else {
            setSepayPublic({ vietQrEnabled: false, usdVndRate: 25_000 });
          }
        });
      }
    }
  }, [open, loadPlans, defaultBillingInterval, isVietnamCustomer]);

  useEffect(() => {
    if (isVietnamCustomer && paymentTab === 'sepay') {
      setPaymentTab('lemon');
      return;
    }
    if (sepayPublic && !sepayPublic.vietQrEnabled && paymentTab === 'sepay') {
      setPaymentTab('lemon');
    }
  }, [isVietnamCustomer, sepayPublic?.vietQrEnabled, paymentTab, sepayPublic]);

  const isCurrentPlan = (plan: Plan) => currentPlanId != null && plan.id === currentPlanId;

  const getPlanIcon = (planName: string) => {
    const n = planName.toLowerCase();
    if (n.includes('trial')) return <Zap className="h-6 w-6" />;
    if (n.includes('basic') || n.includes('starter')) return <Package className="h-6 w-6" />;
    if (n.includes('professional') || n.includes('pro')) return <Shield className="h-6 w-6" />;
    if (n.includes('enterprise') || n.includes('business')) return <Building className="h-6 w-6" />;
    return <CreditCard className="h-6 w-6" />;
  };

  const estimatedTotal = useMemo(() => {
    if (!selectedPlan) return null;
    return computeEstimatedTotal(selectedPlan.basePrice, billingCycle);
  }, [selectedPlan, billingCycle]);

  useEffect(() => {
    if (
      !open ||
      !selectedPlan ||
      estimatedTotal == null ||
      isVietnamCustomer ||
      paymentTab !== 'sepay' ||
      !sepayPublic?.vietQrEnabled
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      setSepayQrLoading(true);
      setSepayQrError(null);
      const amountVnd = amountToVndForSepayQr(
        estimatedTotal,
        selectedPlan.currency,
        sepayPublic.usdVndRate
      );
      const res = await sepayApi.createSubscriptionTransferQr({
        amountVnd,
        planId: selectedPlan.id,
      });
      if (cancelled) return;
      if (res.success && res.data) {
        setSepayQrData(res.data);
      } else {
        setSepayQrError(
          typeof res.message === 'string' ? res.message : t('sepayQrError')
        );
        setSepayQrData(null);
      }
      setSepayQrLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedPlan?.id,
    selectedPlan?.currency,
    estimatedTotal,
    billingCycle,
    paymentTab,
    isVietnamCustomer,
    sepayPublic?.vietQrEnabled,
    sepayPublic?.usdVndRate,
    t,
  ]);

  const startLemonCheckout = async () => {
    if (!selectedPlan) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const buildReturnUrl = (checkout: 'success' | 'cancel') => {
      const url = new URL(checkoutReturnPath, origin);
      url.searchParams.set('checkout', checkout);
      return url.toString();
    };
    const successUrl = buildReturnUrl('success');
    const cancelUrl = buildReturnUrl('cancel');

    setCheckoutLoading(true);
    try {
      const result = await lemonsqueezyApi.createSubscriptionCheckout({
        planId: selectedPlan.id,
        billingInterval: billingCycle,
        successUrl,
        cancelUrl,
      });
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
        return;
      }
      const msg =
        typeof result.message === 'string'
          ? result.message
          : t('checkoutErrorBody');
      toastError(t('checkoutErrorTitle'), msg);
    } catch (e) {
      console.error(e);
      toastError(t('checkoutErrorTitle'), t('checkoutErrorBody'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 overflow-y-auto flex-1 min-h-0">
          {loading && (
            <p className="text-sm text-text-secondary py-8 text-center">{t('loading')}</p>
          )}
          {!loading && loadError && (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-destructive">{t('loadError')}</p>
              <Button variant="outline" size="sm" onClick={() => void loadPlans()}>
                {t('retry')}
              </Button>
            </div>
          )}
          {!loading && !loadError && plans.length === 0 && (
            <p className="text-sm text-text-secondary py-8 text-center">{t('empty')}</p>
          )}

          {!loading && !loadError && plans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {plans.map((plan) => {
                const isCurrent = isCurrentPlan(plan);
                const isPopular = plan.isPopular;

                return (
                  <Card
                    key={plan.id}
                    className={`relative ${isCurrent ? 'ring-2 ring-blue-500' : ''} ${isPopular ? 'border-orange-200' : ''}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-orange-500 text-white px-3 py-1">
                          <Star className="h-3 w-3 mr-1" />
                          {t('popular')}
                        </Badge>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 right-4">
                        <Badge className="bg-blue-500 text-white px-3 py-1">
                          <Check className="h-3 w-3 mr-1" />
                          {t('currentPlan')}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-2">{getPlanIcon(plan.name)}</div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                      <div className="mt-4">
                        <div className="text-2xl font-bold">
                          {formatCurrency(plan.basePrice, plan.currency)}
                        </div>
                        <div className="text-xs text-gray-500">{t('perMonth')}</div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm mb-2">{t('features')}</h4>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {getPlanFeatures(plan).map((feature: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              <span className="text-xs text-gray-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        {isCurrent ? (
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setBillingCycle(subscriptionIntervalToUiCycle(defaultBillingInterval));
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t('renewSamePlan')}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setSelectedPlan(plan)}
                            className="w-full"
                            size="sm"
                            variant={isPopular ? 'default' : 'outline'}
                          >
                            {selectedPlan?.id === plan.id ? t('selected') : t('selectPlan')}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && !loadError && selectedPlan && estimatedTotal != null && (
            <Card className="mt-6 border-blue-200 bg-blue-50/80">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t('selectedSummary', { name: selectedPlan.name })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label className="text-sm">{t('billingCycle')}</Label>
                  <Select
                    value={billingCycle}
                    onValueChange={(value) => setBillingCycle(value as UiBillingCycle)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">
                        {t('cycleMonthly', {
                          price: formatCurrency(selectedPlan.basePrice, selectedPlan.currency),
                        })}
                      </SelectItem>
                      <SelectItem value="quarterly">
                        {t('cycleQuarterly', {
                          price: formatCurrency(selectedPlan.basePrice * 3, selectedPlan.currency),
                        })}
                      </SelectItem>
                      <SelectItem value="semi_annual">
                        {t('cycleSemiAnnual', {
                          price: formatCurrency(selectedPlan.basePrice * 6, selectedPlan.currency),
                        })}
                      </SelectItem>
                      <SelectItem value="annual">
                        {t('cycleAnnual', {
                          price: formatCurrency(selectedPlan.basePrice * 12 * 0.9, selectedPlan.currency),
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-blue-200/80 bg-white p-4 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('totalDue')}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(estimatedTotal, selectedPlan.currency)}
                  </p>
                  {paymentTab === 'lemon' && (
                    <p className="text-xs text-muted-foreground">{t('priceNote')}</p>
                  )}
                  {paymentTab === 'sepay' &&
                    sepayPublic?.vietQrEnabled &&
                    selectedPlan.currency?.toUpperCase() !== 'VND' && (
                      <p className="text-xs text-amber-800 mt-2">
                        {t('sepayConvertNote', { rate: sepayPublic.usdVndRate })}
                      </p>
                    )}
                </div>

                {!isVietnamCustomer && sepayPublic?.vietQrEnabled && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentTab === 'lemon' ? 'default' : 'outline'}
                      onClick={() => setPaymentTab('lemon')}
                    >
                      {t('payMethodLemon')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentTab === 'sepay' ? 'default' : 'outline'}
                      onClick={() => setPaymentTab('sepay')}
                    >
                      {t('payMethodSepay')}
                    </Button>
                  </div>
                )}

                {isVietnamCustomer && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <p className="text-sm font-medium text-amber-900">{t('manualTransferTitle')}</p>
                    <p className="text-xs text-amber-900/90">{t('manualTransferHint')}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      size="sm"
                      onClick={() => window.open(`tel:${contactPhone}`, '_blank')}
                    >
                      {t('manualTransferCta')}
                    </Button>
                  </div>
                )}

                {paymentTab === 'lemon' && (
                  <Button
                    className="w-full sm:w-auto"
                    size="lg"
                    disabled={checkoutLoading}
                    onClick={() => void startLemonCheckout()}
                  >
                    {checkoutLoading ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-5 w-5 mr-2" />
                    )}
                    {t('lemonCheckoutButton', {
                      amount: formatCurrency(estimatedTotal, selectedPlan.currency),
                    })}
                  </Button>
                )}

                {!isVietnamCustomer && paymentTab === 'sepay' && sepayPublic?.vietQrEnabled && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
                    <SePayVietQrPanel
                      loading={sepayQrLoading}
                      errorMessage={sepayQrError}
                      data={sepayQrData}
                      usdVndRate={sepayPublic.usdVndRate}
                      planCurrency={selectedPlan.currency}
                      showUsdConvertNote
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={checkoutLoading || (paymentTab === 'sepay' && sepayQrLoading)}
          >
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
