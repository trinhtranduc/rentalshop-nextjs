'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { plansApi, planStripePricesApi } from '@rentalshop/utils';
import type { Plan } from '@rentalshop/types';
import type { PlanBillingInterval } from '@rentalshop/utils';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Badge,
  useToast,
} from '@rentalshop/ui';

const intervals: Array<{ key: PlanBillingInterval; label: string }> = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly (3 months)' },
  { key: 'semi_annual', label: 'Semi-annual (6 months)' },
  { key: 'annual', label: 'Annual (12 months)' },
];

export default function PlansBillingPage() {
  const { toastSuccess, toastError } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [activeTab, setActiveTab] = useState<'prices' | 'orders'>('prices');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const [loadingPrices, setLoadingPrices] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [currency, setCurrency] = useState('');
  const [prices, setPrices] = useState<Partial<Record<PlanBillingInterval, string>>>({});

  useEffect(() => {
    const loadPlans = async () => {
      setLoadingPlans(true);
      try {
        const resp = await plansApi.getPlans({ limit: 200, includeInactive: true });
        if (resp.success && resp.data?.plans) {
          setPlans(resp.data.plans);
          if (resp.data.plans.length > 0) setSelectedPlanId(resp.data.plans[0].id);
        } else {
          setPlans([]);
        }
      } catch (e) {
        console.error(e);
        setPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  useEffect(() => {
    const loadStripePrices = async () => {
      if (!selectedPlanId) return;
      setLoadingPrices(true);
      setPrices({});
      const plan = plans.find((p) => p.id === selectedPlanId);
      setCurrency(plan?.currency || '');
      try {
        const resp = await planStripePricesApi.get(selectedPlanId);
        if (resp.success && resp.data) {
          const next: Partial<Record<PlanBillingInterval, string>> = {};
          for (const item of resp.data.items || []) {
            next[item.billingInterval] = item.stripePriceId;
            if (item.currency) setCurrency(String(item.currency));
          }
          setPrices(next);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPrices(false);
      }
    };
    loadStripePrices();
  }, [selectedPlanId, plans]);

  const handleSave = async () => {
    if (!selectedPlanId) return;
    setSavingPrices(true);
    try {
      const resp = await planStripePricesApi.upsert(selectedPlanId, {
        currency: currency || undefined,
        prices,
      });
      if (resp.success) {
        toastSuccess('Saved', 'Stripe price IDs updated');
      } else {
        toastError('Save failed', resp.message || 'Could not update Stripe prices');
      }
    } catch (e) {
      console.error(e);
      toastError('Save failed', 'Could not update Stripe prices');
    } finally {
      setSavingPrices(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <PageTitle>Plans Billing</PageTitle>
            <p className="text-sm text-text-secondary mt-1">
              Setup Stripe price IDs per plan & billing interval.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open('https://dashboard.stripe.com/test/prices', '_blank')}
          >
            Open Stripe
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'prices' ? 'default' : 'outline'}
            onClick={() => setActiveTab('prices')}
          >
            Prices
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            onClick={() => setActiveTab('orders')}
          >
            Stripe Orders
          </Button>
        </div>

        {activeTab === 'orders' ? (
          <Card>
            <CardHeader>
              <CardTitle>Stripe Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                Coming soon. This tab is reserved for listing Stripe invoices/payments/events.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <CardTitle>Stripe Price IDs</CardTitle>
                  {selectedPlan && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary">Plan #{selectedPlan.id}</Badge>
                      <span className="text-sm text-text-secondary">{selectedPlan.name}</span>
                    </div>
                  )}
                </div>
                <div className="w-72">
                  <Select
                    value={selectedPlanId ? String(selectedPlanId) : ''}
                    onValueChange={(v) => setSelectedPlanId(parseInt(v))}
                    disabled={loadingPlans}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingPlans ? 'Loading plans...' : 'Select a plan'} />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Currency (optional)</label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="VND / USD" />
              </div>

              {loadingPrices ? (
                <div className="py-6 text-sm text-text-secondary">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {intervals.map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-gray-500">{label}</label>
                      <Input
                        value={prices[key] || ''}
                        onChange={(e) => setPrices((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="price_..."
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={savingPrices || !selectedPlanId}>
                  {savingPrices ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </PageWrapper>
  );
}

