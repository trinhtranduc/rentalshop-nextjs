"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@rentalshop/ui';
import { formatDate, formatCurrency, Card, CardContent } from '@rentalshop/ui';
import { Calendar, Loader2, Package } from 'lucide-react';
import type { Subscription, BillingInterval, PlanLimitAddon } from '@rentalshop/types';
import { subscriptionsApi } from '@rentalshop/utils';
import { BILLING_CYCLES_ARRAY } from '@rentalshop/constants';
// Type assertion for calculateExtensionPrice (newly added function)
const api = subscriptionsApi as typeof subscriptionsApi & {
  calculateExtensionPrice: (id: number, newEndDate: Date | string) => Promise<any>;
};

interface SubscriptionExtendDialogEnhancedProps {
  subscription: Subscription | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subscription: Subscription, data: {
    newEndDate: Date;
    amount: number;
    method: string;
    description?: string;
    sendEmail?: boolean;
  }) => void;
  loading?: boolean;
}

const EXTENSION_METHODS = [
  { value: 'MANUAL_EXTENSION', label: 'Manual Extension' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'ADMIN_EXTENSION', label: 'Admin Extension' },
  { value: 'COMPENSATION', label: 'Compensation' }
];

type BillingCycleConfig = {
  value: BillingInterval;
  label: string;
  months: number;
  discount: number;
  description: string;
};

export function SubscriptionExtendDialogEnhanced({
  subscription,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}: SubscriptionExtendDialogEnhancedProps) {
  const [extensionMode, setExtensionMode] = useState<'period' | 'custom'>('period');
  const [billingPeriod, setBillingPeriod] = useState<BillingInterval>('monthly');
  const [newEndDate, setNewEndDate] = useState('');
  const [method, setMethod] = useState('MANUAL_EXTENSION');
  const [description, setDescription] = useState('');
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [calculating, setCalculating] = useState(false);
  const [calculation, setCalculation] = useState<{
    extensionDays: number;
    extensionPrice: number;
    currency: string;
    currentPeriodDays?: number;
    usedDays?: number;
    remainingDays?: number;
    periodPrice?: number;
    dailyPrice?: number;
    usedValue?: number;
    remainingValue?: number;
    totalPrice?: number;
    breakdown?: {
      currentPlan: {
        name: string;
        periodStart: string;
        periodEnd: string;
        periodDays: number;
        usedDays: number;
        remainingDays: number;
        periodPrice: number;
        usedValue: number;
        remainingValue: number;
        dailyPrice: number;
      };
      extension: {
        days: number;
        price: number;
      };
      total: number;
    };
    formula?: {
      step1?: string;
      step2?: string;
      step3?: string;
      calculation?: string;
      withRemaining?: string | null;
    };
  } | null>(null);
  const [manualPrice, setManualPrice] = useState<string>('');
  const [addons, setAddons] = useState<PlanLimitAddon[]>([]);
  const [totalAddonLimits, setTotalAddonLimits] = useState({
    outlets: 0,
    users: 0,
    products: 0,
    customers: 0,
    orders: 0
  });

  // Calculate end date from billing period
  const calculateEndDateFromPeriod = (startDate: Date, interval: BillingInterval): Date => {
    const end = new Date(startDate);
    const cycleConfig = BILLING_CYCLES_ARRAY.find((c: BillingCycleConfig) => c.value === interval);
    if (!cycleConfig) return end;
    
    const originalDay = startDate.getDate();
    end.setMonth(end.getMonth() + cycleConfig.months);
    
    // Handle month boundary issues
    if (end.getDate() !== originalDay) {
      end.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }
    
    return end;
  };

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen && subscription) {
      const currentEnd = subscription.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd)
        : new Date();
      
      if (extensionMode === 'period') {
        // Calculate end date from billing period
        const calculatedEnd = calculateEndDateFromPeriod(currentEnd, billingPeriod);
        calculatedEnd.setHours(0, 0, 0, 0);
        setNewEndDate(calculatedEnd.toISOString().split('T')[0]);
      } else if (extensionMode === 'custom' && !newEndDate) {
        // Default to 30 days for custom mode (only if newEndDate is empty)
        const defaultDate = new Date(currentEnd);
        defaultDate.setDate(defaultDate.getDate() + 30);
        defaultDate.setHours(0, 0, 0, 0);
        setNewEndDate(defaultDate.toISOString().split('T')[0]);
      }
    }
  }, [isOpen, subscription, extensionMode]);

  // Update newEndDate when billing period changes (only in period mode)
  useEffect(() => {
    if (extensionMode === 'period' && subscription && billingPeriod && isOpen) {
      const currentEnd = subscription.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd)
        : new Date();
      const calculatedEnd = calculateEndDateFromPeriod(currentEnd, billingPeriod);
      calculatedEnd.setHours(0, 0, 0, 0);
      const newDateStr = calculatedEnd.toISOString().split('T')[0];
      setNewEndDate(newDateStr);
    }
  }, [billingPeriod, extensionMode, subscription, isOpen]);

  // Fetch addons when dialog opens
  useEffect(() => {
    if (isOpen && subscription?.merchantId) {
      const fetchAddons = async () => {
        try {
          const { planLimitAddonsApi } = await import('@rentalshop/utils');
          const result = await planLimitAddonsApi.getMerchantPlanLimitAddons(
            subscription.merchantId!,
            { isActive: true, page: 1, limit: 100, offset: 0 }
          );
          
          if (result.success && result.data) {
            const activeAddons = result.data.addons || [];
            setAddons(activeAddons);
            
            // Calculate total addon limits
            const totals = activeAddons.reduce(
              (acc, addon) => ({
                outlets: acc.outlets + (addon.outlets || 0),
                users: acc.users + (addon.users || 0),
                products: acc.products + (addon.products || 0),
                customers: acc.customers + (addon.customers || 0),
                orders: acc.orders + (addon.orders || 0)
              }),
              { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 }
            );
            setTotalAddonLimits(totals);
          }
        } catch (error) {
          console.error('Error fetching addons:', error);
        }
      };
      
      fetchAddons();
    }
  }, [isOpen, subscription?.merchantId]);

  // Calculate price when newEndDate changes
  useEffect(() => {
    if (!subscription || !newEndDate || !isOpen) {
      setCalculation(null);
      return;
    }

    const calculatePrice = async () => {
      try {
        setCalculating(true);
        const result = await api.calculateExtensionPrice(
          subscription.id,
          newEndDate
        );

        if (result.success && result.data) {
          const finalPrice = result.data.totalPrice || result.data.extensionPrice;
          console.log('📊 Extension calculation result:', result.data);
          console.log('📊 Formula from API:', result.data.formula);
          
          // Build formula if API doesn't provide it
          let formula = result.data.formula;
          if (!formula || !formula.step1) {
            const data = result.data;
            const planName = subscription.plan?.name || 'Unknown';
            const currency = data.currency || 'VND';
            
            formula = {
              step1: data.usedDays && data.currentPeriodDays 
                ? `Current Plan (${planName}): ${data.usedDays} days used / ${data.currentPeriodDays} days = ${formatCurrency(data.usedValue || 0, currency as any)} used, ${data.remainingDays || 0} days remaining = ${formatCurrency(data.remainingValue || 0, currency as any)} remaining (still in use)`
                : undefined,
              step2: data.extensionDays && data.currentPeriodDays
                ? `Extension: ${data.extensionDays} days / ${data.currentPeriodDays} days × ${formatCurrency(data.periodPrice || 0, currency as any)} = ${formatCurrency(data.extensionPrice || 0, currency as any)}`
                : undefined,
              step3: data.totalPrice
                ? `Total: Extension Price = ${formatCurrency(data.extensionPrice || 0, currency as any)} (Remaining value ${formatCurrency(data.remainingValue || 0, currency as any)} continues to be used)`
                : undefined
            };
            console.log('📊 Generated formula:', formula);
          }
          
          setCalculation({
            extensionDays: result.data.extensionDays,
            extensionPrice: result.data.extensionPrice,
            currency: result.data.currency,
            currentPeriodDays: result.data.currentPeriodDays,
            usedDays: result.data.usedDays,
            remainingDays: result.data.remainingDays,
            periodPrice: result.data.periodPrice,
            dailyPrice: result.data.dailyPrice,
            usedValue: result.data.usedValue,
            remainingValue: result.data.remainingValue,
            totalPrice: result.data.totalPrice,
            breakdown: result.data.breakdown,
            formula: formula
          });
          // Auto-fill manual price with calculated total price
          if (!manualPrice) {
            setManualPrice(finalPrice.toString());
          }
        }
      } catch (error) {
        console.error('Error calculating extension price:', error);
        setCalculation(null);
      } finally {
        setCalculating(false);
      }
    };

    // Debounce calculation
    const timeoutId = setTimeout(calculatePrice, 500);
    return () => clearTimeout(timeoutId);
  }, [subscription, newEndDate, isOpen]);

  const handleSubmit = () => {
    if (!subscription || !newEndDate || !calculation) return;
    
    const calculatedEndDate = new Date(newEndDate + 'T23:59:59');
    
    // Use manual price if provided, otherwise use calculated total price
    const finalPrice = manualPrice ? parseFloat(manualPrice) : (calculation.totalPrice || calculation.extensionPrice);
    
    const extensionData = {
      newEndDate: calculatedEndDate,
      amount: finalPrice,
      method,
      description: description.trim() || undefined,
      sendEmail
    };
    
    onConfirm(subscription, extensionData);
  };

  const handleClose = () => {
    setExtensionMode('period');
    setBillingPeriod('monthly');
    setNewEndDate('');
    setMethod('MANUAL_EXTENSION');
    setDescription('');
    setSendEmail(true);
    setCalculation(null);
    setManualPrice('');
    setAddons([]);
    setTotalAddonLimits({ outlets: 0, users: 0, products: 0, customers: 0, orders: 0 });
    onClose();
  };

  if (!subscription) return null;

  const oldEndDate = subscription.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd)
    : new Date();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-action-primary" />
            Extend Subscription
          </DialogTitle>
          <DialogDescription className="text-sm">
            {subscription.plan?.name} • Ends {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Extension Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExtensionMode('period')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                extensionMode === 'period'
                  ? 'bg-action-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quick Extend
            </button>
            <button
              type="button"
              onClick={() => setExtensionMode('custom')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                extensionMode === 'custom'
                  ? 'bg-action-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Date
            </button>
          </div>

          {/* Billing Period or Custom Date */}
          {extensionMode === 'period' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="billingPeriod" className="text-xs font-medium">
                    Billing Period *
                  </Label>
                  <Select value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as BillingInterval)}>
                    <SelectTrigger id="billingPeriod" className="w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CYCLES_ARRAY.map((cycle: BillingCycleConfig) => (
                        <SelectItem key={cycle.value} value={cycle.value}>
                          {cycle.label} {cycle.discount > 0 && `(${cycle.discount}% off)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Extension Price - Editable */}
                <div className="space-y-1.5">
                  <Label htmlFor="extensionPrice" className="text-xs font-medium">
                    Extension Price *
                  </Label>
                  {calculating ? (
                    <div className="flex items-center gap-2 h-10 text-muted-foreground text-sm border border-border rounded-md px-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Calculating...</span>
                    </div>
                  ) : calculation ? (
                    <div className="space-y-1">
                      <Input
                        id="extensionPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        placeholder={(calculation.totalPrice || calculation.extensionPrice).toString()}
                        className="w-full text-sm"
                      />
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Auto: {formatCurrency(calculation.totalPrice || calculation.extensionPrice, calculation.currency as any)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {calculation.extensionDays} days
                          </Badge>
                        </div>
                        {calculation.formula && (
                          <div className="pt-1 border-t border-gray-200 space-y-1">
                            <div className="text-[10px] text-gray-600 font-medium">Calculation Details:</div>
                            <div className="text-[10px] text-gray-500 space-y-0.5">
                              {calculation.formula.step1 && <div>1. {calculation.formula.step1}</div>}
                              {calculation.formula.step2 && <div>2. {calculation.formula.step2}</div>}
                              {calculation.formula.step3 && (
                                <div className="font-semibold text-gray-700">3. {calculation.formula.step3}</div>
                              )}
                              {!calculation.formula.step1 && calculation.formula.calculation && (
                                <div className="font-mono text-[10px]">{calculation.formula.calculation}</div>
                              )}
                              {!calculation.formula.step1 && calculation.formula.withRemaining && (
                                <div className="font-medium text-[10px]">{calculation.formula.withRemaining}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 px-3 flex items-center text-sm text-muted-foreground border border-border rounded-md">
                      Select period to calculate
                    </div>
                  )}
                </div>
              </div>
              
              {/* Display Calculated End Date */}
              {newEndDate && (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-xs text-gray-600">New End Date:</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(newEndDate)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="newEndDate" className="text-xs font-medium">
                  New End Date *
                </Label>
                <Input
                  id="newEndDate"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  min={oldEndDate.toISOString().split('T')[0]}
                  className="w-full text-sm"
                />
              </div>
              
              {/* Extension Price - Editable */}
              <div className="space-y-1.5">
                <Label htmlFor="extensionPrice" className="text-xs font-medium">
                  Extension Price *
                </Label>
                {calculating ? (
                  <div className="flex items-center gap-2 h-10 text-muted-foreground text-sm border border-border rounded-md px-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculating...</span>
                  </div>
                ) : calculation ? (
                  <div className="space-y-1">
                    <Input
                      id="extensionPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder={calculation.extensionPrice.toString()}
                      className="w-full text-sm"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Auto: {formatCurrency(calculation.totalPrice || calculation.extensionPrice, calculation.currency as any)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {calculation.extensionDays} days
                        </Badge>
                      </div>
                      {calculation.formula && (
                        <div className="pt-1 border-t border-gray-200 space-y-1">
                          <div className="text-[10px] text-gray-600 font-medium">Calculation Details:</div>
                          <div className="text-[10px] text-gray-500 space-y-0.5">
                            {calculation.formula.step1 && <div>1. {calculation.formula.step1}</div>}
                            {calculation.formula.step2 && <div>2. {calculation.formula.step2}</div>}
                            {calculation.formula.step3 && (
                              <div className="font-semibold text-gray-700">3. {calculation.formula.step3}</div>
                            )}
                            {!calculation.formula.step1 && calculation.formula.calculation && (
                              <div className="font-mono">{calculation.formula.calculation}</div>
                            )}
                            {!calculation.formula.step1 && calculation.formula.withRemaining && (
                              <div className="font-medium">{calculation.formula.withRemaining}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-10 px-3 flex items-center text-sm text-muted-foreground border border-border rounded-md">
                    Select date to calculate
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Addons - Compact */}
          {addons.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-action-primary" />
                  <Label className="text-xs font-semibold">Active Addons ({addons.length})</Label>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-gray-600">
                    Additional limits: {[
                      totalAddonLimits.outlets > 0 && `${totalAddonLimits.outlets} Outlets`,
                      totalAddonLimits.users > 0 && `${totalAddonLimits.users} Users`,
                      totalAddonLimits.products > 0 && `${totalAddonLimits.products} Products`,
                      totalAddonLimits.customers > 0 && `${totalAddonLimits.customers} Customers`,
                      totalAddonLimits.orders > 0 && `${totalAddonLimits.orders} Orders`
                    ].filter(Boolean).join(', ') || 'None'}
                  </div>
                  <div className="text-xs text-gray-500 italic">
                    Addons will remain active after extension
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Method, Note & Send Email - Compact Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="method" className="text-xs font-medium">Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full p-2 text-sm border border-border rounded-md focus:ring-2 focus:ring-action-primary focus:border-transparent"
              >
                {EXTENSION_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">Note (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason..."
                className="w-full text-sm"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center space-x-2 w-full">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 text-action-primary focus:ring-action-primary border-border rounded"
                />
                <Label htmlFor="sendEmail" className="text-xs font-normal cursor-pointer">
                  Send email notification
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !newEndDate || !calculation || calculating || !manualPrice}
          >
            {loading ? 'Extending...' : 'Extend Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
