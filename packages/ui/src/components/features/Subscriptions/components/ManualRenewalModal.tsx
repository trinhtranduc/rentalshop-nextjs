'use client'

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@rentalshop/ui';
import { formatCurrency, formatInShopZone, calculateRenewalTotal, renewalIntervalForMonths } from '@rentalshop/utils';
import { todayShopKey } from '../../Availability/availability-days';
import { 
  RENEWAL_DURATIONS
} from '@rentalshop/constants';
import { ResponsiveDialogFooter, DetailsToggle } from './ResponsiveDialogFooter';
import { CreditCard, Building2, AlertCircle } from 'lucide-react';

interface ManualRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: number;
    merchantName: string;
    planName: string;
    amount: number;
    currency: string;
    currentPeriodEnd: Date;
    /** The plan's monthly price; the API prices a renewal from it (#779). Without it no price is shown. */
    plan?: { basePrice?: number | null } | null;
  };
  onRenew: (data: RenewalData) => Promise<void>;
  loading?: boolean;
}

type RenewalMonths = 1 | 3 | 6 | 12;

interface RenewalData {
  method: 'STRIPE' | 'TRANSFER';
  duration: RenewalMonths;
  transactionId: string;
  reference?: string;
  description?: string;
  paymentDate?: string;
}

export function ManualRenewalModal({
  isOpen,
  onClose,
  subscription,
  onRenew,
  loading = false
}: ManualRenewalModalProps) {
  const [method, setMethod] = useState<'STRIPE' | 'TRANSFER'>('TRANSFER');
  const [duration, setDuration] = useState<RenewalMonths>(1);
  const [transactionId, setTransactionId] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  // Default payment date: today on the Vietnam day (YYYY-MM-DD)
  const [paymentDate, setPaymentDate] = useState<string>(() => todayShopKey());
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Phone only: the per-option period lines and the price breakdown stay closed until asked for
  const [showDetails, setShowDetails] = useState(false);
  const detailsCls = showDetails ? '' : 'max-md:hidden';

  // Same calculation as POST /api/subscriptions/[id]/renew (#779): plan monthly price for the cycle with the
  // cycle discount (0 / 0 / 5 / 10 %); an expired subscription renews from now, otherwise from the current end.
  const monthlyPrice = subscription.plan?.basePrice;
  const hasPrice = typeof monthlyPrice === 'number' && Number.isFinite(monthlyPrice);
  const renewalFor = (months: number) =>
    calculateRenewalTotal({
      basePrice: hasPrice ? (monthlyPrice as number) : 0,
      interval: renewalIntervalForMonths(months) ?? 'monthly',
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  const renewal = renewalFor(duration);
  const baseAmount = hasPrice ? (monthlyPrice as number) * renewal.months : 0;
  const savings = Math.max(0, baseAmount - renewal.planPrice);
  const nextPeriodStart = renewal.periodStart;
  const nextPeriodEnd = renewal.periodEnd;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!transactionId.trim()) {
      newErrors.transactionId = 'Transaction ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await onRenew({
        method,
        duration,
        transactionId,
        reference: reference || undefined,
        description: description || `${duration} month${duration > 1 ? 's' : ''} subscription renewal - ${formatInShopZone(new Date(), 'en', { month: 'long', year: 'numeric' })}`,
        paymentDate: paymentDate || todayShopKey()
      });

      // Reset form
      setTransactionId('');
      setReference('');
      setDescription('');
      setPaymentDate(todayShopKey());
      onClose();
    } catch (error) {
      console.error('Renewal failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="ar-dialog md:max-w-lg max-h-[90vh] overflow-hidden flex flex-col max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:p-4 max-md:pb-0 max-md:gap-0 max-md:[&>button]:right-1.5 max-md:[&>button]:top-1.5 max-md:[&>button]:p-3.5">
        <DialogHeader className="flex-shrink-0 max-md:pr-10 max-md:pb-3">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-ar-primary" />
            Renew Subscription
          </DialogTitle>
          <DialogDescription>
            Extend subscription for {subscription.merchantName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2 max-md:min-h-0 max-md:space-y-4 max-md:pr-0">
          {/* Current Plan Display */}
          <div className="p-4 bg-ar-surface-muted border border-ar-line rounded-xl">
            <p className="text-sm text-ar-muted mb-1">Current Plan</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-lg">{subscription.planName}</p>
              {hasPrice && (
                <p className="font-semibold text-lg">{formatCurrency(monthlyPrice as number, subscription.currency as any)}/month</p>
              )}
            </div>
            <p className="text-sm text-ar-muted mt-2">
              Expires: {formatInShopZone(subscription.currentPeriodEnd)}
            </p>
          </div>

          {/* Renewal Duration Selection */}
          <div>
            <Label htmlFor="duration">Renewal Period *</Label>
            <Select 
              value={duration.toString()} 
              onValueChange={(value) => setDuration(parseInt(value) as RenewalMonths)}
            >
              <SelectTrigger className="max-md:min-h-11">
                <SelectValue placeholder="Choose renewal period..." />
              </SelectTrigger>
              <SelectContent>
                {RENEWAL_DURATIONS.map((option) => {
                  const optionRenewal = renewalFor(option.months);
                  const discount = optionRenewal.discountPercent;

                  return (
                    <SelectItem key={option.months} value={option.months.toString()}>
                      <div className="flex flex-col py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.name}</span>
                          {hasPrice && (
                            <span className="font-semibold">{formatCurrency(optionRenewal.totalDue, subscription.currency as any)}</span>
                          )}
                          {discount > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              Save {discount}%
                            </span>
                          )}
                        </div>
                        <span className={`text-xs text-ar-muted mt-0.5 ${detailsCls}`}>
                          Period: {formatInShopZone(optionRenewal.periodStart, 'en', { month: 'short', day: 'numeric' })} - {formatInShopZone(optionRenewal.periodEnd)}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-ar-muted mt-1">
              Longer renewal periods offer better discounts
            </p>
          </div>

          {/* Renewal Period Display */}
          <div className="p-4 bg-ar-surface-muted border border-ar-line rounded-xl">
            <p className="font-semibold text-ar-ink mb-2">Renewal Period</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ar-muted">Start Date:</span>
                <span className="font-medium text-ar-ink">
                  {formatInShopZone(nextPeriodStart)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ar-muted">End Date:</span>
                <span className="font-medium text-ar-ink">
                  {formatInShopZone(nextPeriodEnd)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-ar-line">
                <span className="text-ar-muted">Duration:</span>
                <span className="font-semibold text-ar-ink">
                  {RENEWAL_DURATIONS.find(d => d.months === duration)?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-ar-primary-soft border border-ar-line rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-ar-ink">Pricing Summary</p>
              {hasPrice && <DetailsToggle open={showDetails} onToggle={() => setShowDetails(v => !v)} />}
            </div>
            {hasPrice ? (
              <div className="space-y-2 text-sm">
                <div className={`flex justify-between ${detailsCls}`}>
                  <span>Monthly Price:</span>
                  <span className="font-medium">{formatCurrency(monthlyPrice as number, subscription.currency as any)}/month</span>
                </div>
                <div className={`flex justify-between ${detailsCls}`}>
                  <span>Base Price ({renewal.months} × {formatCurrency(monthlyPrice as number, subscription.currency as any)}):</span>
                  <span className="font-medium">{formatCurrency(baseAmount, subscription.currency as any)}</span>
                </div>
                {savings > 0 && (
                  <div className={`flex justify-between text-green-700 ${detailsCls}`}>
                    <span>Discount ({renewal.discountPercent}%):</span>
                    <span className="font-medium">-{formatCurrency(savings, subscription.currency as any)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t text-base">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-ar-primary-ink">{formatCurrency(renewal.totalDue, subscription.currency as any)}</span>
                </div>
                <div className={`flex justify-between text-xs text-ar-muted ${detailsCls}`}>
                  <span>New period:</span>
                  <span>{formatInShopZone(nextPeriodStart)} - {formatInShopZone(nextPeriodEnd)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ar-muted flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Plan price unavailable. The server calculates the amount from the plan when the renewal is processed.
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <Label>Payment Method *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setMethod('TRANSFER')}
                className={`p-3 border-2 rounded-xl text-left transition-all justify-start h-auto max-md:min-h-11 ${
                  method === 'TRANSFER' 
                    ? 'border-ar-primary bg-ar-primary-soft' 
                    : 'border-ar-line hover:border-ar-line-strong'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-ar-muted" />
                  <span className="font-medium">Bank Transfer</span>
                </div>
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setMethod('STRIPE')}
                className={`p-3 border-2 rounded-xl text-left transition-all justify-start h-auto max-md:min-h-11 ${
                  method === 'STRIPE' 
                    ? 'border-ar-primary bg-ar-primary-soft' 
                    : 'border-ar-line hover:border-ar-line-strong'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-ar-muted" />
                  <span className="font-medium">Stripe</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <Label htmlFor="transactionId">
              Transaction ID *
              <span className="text-ar-muted text-sm font-normal ml-2">
                {method === 'STRIPE' ? '(e.g., txn_1234567890)' : '(Bank reference number)'}
              </span>
            </Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder={method === 'STRIPE' ? 'txn_1234567890' : 'BANK-REF-123'}
              className={`max-md:min-h-11 ${errors.transactionId ? 'border-red-500' : ''}`}
            />
            {errors.transactionId && (
              <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-4 h-4" />
                {errors.transactionId}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <Label htmlFor="paymentDate">Payment Date (Optional)</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={todayShopKey()}
              className="max-md:min-h-11"
            />
            <p className="text-xs text-ar-muted mt-1">
              Default: Today ({formatInShopZone(new Date())})
            </p>
          </div>

          {/* Reference Number */}
          <div>
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="REF-2025-001"
              className="max-md:min-h-11"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${duration} month${duration > 1 ? 's' : ''} subscription renewal - ${formatInShopZone(new Date(), 'en', { month: 'long', year: 'numeric' })}`}
              rows={3}
            />
            <p className="text-xs text-ar-muted mt-1">
              Add any additional notes or context for this renewal
            </p>
          </div>
        </div>

        <ResponsiveDialogFooter
          className="ar-dialog-footer md:border-t md:border-ar-line md:pt-4 md:mt-4 max-md:-mx-4"
          summaryLabel="Total"
          summaryAmount={hasPrice ? formatCurrency(renewal.totalDue, subscription.currency as any) : undefined}
          secondary={
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          }
          primary={
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Processing...' : 'Process Renewal'}
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
