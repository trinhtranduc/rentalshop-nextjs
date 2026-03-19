'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  PageLoadingIndicator,
} from '@rentalshop/ui';
import { AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth, useSubscriptionStatusInfo } from '@rentalshop/hooks';
import { lemonsqueezyApi, publicPlansApi, normalizeBillingInterval } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import type { Plan } from '@rentalshop/types';
import { useRouter } from 'next/navigation';

export interface SubscriptionRenewalBottomBarProps {
  /** Notify layout to add bottom padding so content is not hidden behind the fixed bar */
  onInsetChange?: (insetPx: number) => void;
}

/**
 * Fixed bottom bar when merchant subscription is expired / no access.
 * MERCHANT can open pricing dialog and pay via Lemon Squeezy.
 * Outlet roles see plans but must ask merchant owner to complete payment.
 */
export default function SubscriptionRenewalBottomBar({ onInsetChange }: SubscriptionRenewalBottomBarProps) {
  const t = useTranslations('subscription.bottomBar');
  const tActions = useTranslations('subscription.actions');
  const { user } = useAuth();
  const router = useRouter();
  const { loading, hasAccess, status, subscription, refreshStatus } = useSubscriptionStatusInfo();

  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isMerchant = user?.role === USER_ROLE.MERCHANT;
  const isSystemAdmin = user?.role === USER_ROLE.ADMIN;

  /** API `hasAccess` is false for expired, no subscription, and other blocked states */
  const showExpiredBar = !!user && !isSystemAdmin && !loading && !hasAccess;

  useEffect(() => {
    onInsetChange?.(showExpiredBar ? 56 : 0);
  }, [showExpiredBar, onInsetChange]);

  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const result = await publicPlansApi.getPublicPlansWithVariants();
      if (result.success && result.data) {
        const list = Array.isArray(result.data) ? result.data : [];
        setPlans(list);
      } else {
        setPlans([]);
      }
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadPlans();
    }
  }, [open, loadPlans]);

  const formatCurrency = (amount: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const handleOpenPricing = () => {
    setSelectedPlan(null);
    setBillingCycle('monthly');
    setOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedPlan || !isMerchant) return;
    try {
      setCheckoutLoading(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const interval = normalizeBillingInterval(billingCycle);
      const result = await lemonsqueezyApi.createSubscriptionCheckout({
        planId: selectedPlan.id,
        billingInterval: interval,
        successUrl: `${origin}/plans?checkout=success`,
        cancelUrl: `${origin}/plans?checkout=cancel`,
      });
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
        return;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!showExpiredBar) {
    return null;
  }

  const reason =
    subscription?.statusReason ||
    (status === 'NO_SUBSCRIPTION' ? t('noSubscriptionHint') : t('expiredHint'));

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-[55] border-t border-amber-200 bg-amber-50 px-4 py-3 shadow-[0_-4px_14px_rgba(0,0,0,0.08)]"
        role="region"
        aria-label={t('ariaLabel')}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t('title')}</p>
              <p className="text-xs text-amber-900/90 sm:text-sm">{reason}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
              onClick={() => router.push('/subscription')}
            >
              {t('viewDetails')}
            </Button>
            <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700" onClick={handleOpenPricing}>
              {tActions('renewNow')}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('modalTitle')}</DialogTitle>
            <DialogDescription>{t('modalDescription')}</DialogDescription>
          </DialogHeader>

          {!isMerchant && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {t('outletUserHint')}
            </p>
          )}

          <PageLoadingIndicator loading={plansLoading} />

          <div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {plans.map((plan) => {
              const selected = selectedPlan?.id === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-shadow ${selected ? 'ring-2 ring-amber-500' : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {plan.isPopular ? <Badge>{t('popular')}</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                    <p className="pt-2 text-2xl font-bold">{formatCurrency(plan.basePrice, plan.currency)}</p>
                    <p className="text-xs text-muted-foreground">{t('perMonth')}</p>
                  </CardHeader>
                  <CardContent>
                    {selected ? (
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-700">
                        <CheckCircle className="h-4 w-4" />
                        {t('selected')}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('tapToSelect')}</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedPlan && isMerchant && (
            <div className="space-y-2">
              <Label>{t('billingCycle')}</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    {t('cycleMonthly', { price: formatCurrency(selectedPlan.basePrice, selectedPlan.currency) })}
                  </SelectItem>
                  <SelectItem value="quarterly">
                    {t('cycleQuarterly', {
                      price: formatCurrency(selectedPlan.basePrice * 3, selectedPlan.currency),
                    })}
                  </SelectItem>
                  <SelectItem value="yearly">
                    {t('cycleYearly', {
                      price: formatCurrency(selectedPlan.basePrice * 12 * 0.9, selectedPlan.currency),
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('close')}
            </Button>
            {isMerchant ? (
              <Button
                disabled={!selectedPlan || checkoutLoading}
                onClick={() => void handleConfirmCheckout()}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {checkoutLoading ? t('redirecting') : t('payNow')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  void refreshStatus();
                  router.push('/subscription');
                }}
              >
                {t('goToSubscription')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
