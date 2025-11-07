'use client'

import React, { useState } from 'react';
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
  Textarea,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@rentalshop/ui/base';
import { formatDate, formatCurrency } from '@rentalshop/utils';
import { 
  RENEWAL_DURATIONS,
  type RenewalMonths 
} from '@rentalshop/constants';
import { 
  calculateRenewalPrice, 
  calculateSavings,
  getDiscountPercentage
} from '@rentalshop/utils';
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
  };
  onRenew: (data: RenewalData) => Promise<void>;
  loading?: boolean;
}

interface RenewalData {
  method: 'STRIPE' | 'TRANSFER';
  transactionId: string;
  reference?: string;
  description?: string;
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use centralized pricing functions
  const calculateTotal = () => calculateRenewalPrice(subscription.amount, duration);
  const getSavings = () => calculateSavings(subscription.amount, duration);

  const nextPeriodStart = new Date(subscription.currentPeriodEnd);
  const nextPeriodEnd = new Date(nextPeriodStart);
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + duration);

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
        transactionId,
        reference: reference || undefined,
        description: description || `${duration} month${duration > 1 ? 's' : ''} subscription renewal - ${formatDate(new Date(), 'MMMM yyyy')}`
      });

      // Reset form
      setTransactionId('');
      setReference('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Renewal failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            Renew Subscription
          </DialogTitle>
          <DialogDescription>
            Extend subscription for {subscription.merchantName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Current Plan Display */}
          <div className="p-4 bg-gray-50 border rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Current Plan</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-lg">{subscription.planName}</p>
              <p className="font-semibold text-lg">{formatCurrency(subscription.amount, subscription.currency)}/month</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Expires: {formatDate(subscription.currentPeriodEnd, 'MMM dd, yyyy')}
            </p>
          </div>

          {/* Renewal Duration Selection */}
          <div>
            <Label htmlFor="duration">Renewal Period *</Label>
            <Select 
              value={duration.toString()} 
              onValueChange={(value) => setDuration(parseInt(value) as RenewalMonths)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose renewal period..." />
              </SelectTrigger>
              <SelectContent>
                {RENEWAL_DURATIONS.map((option) => {
                  const discount = getDiscountPercentage(option.months);
                  const price = calculateRenewalPrice(subscription.amount, option.months);
                  const endDate = new Date(nextPeriodStart);
                  endDate.setMonth(endDate.getMonth() + option.months);
                  
                  return (
                    <SelectItem key={option.months} value={option.months.toString()}>
                      <div className="flex flex-col py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.name} ({option.label})</span>
                          <span className="font-semibold">{formatCurrency(price, subscription.currency)}</span>
                          {discount > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              Save {discount}%
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 mt-0.5">
                          Period: {formatDate(nextPeriodStart, 'MMM dd')} - {formatDate(endDate, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Longer renewal periods offer better discounts
            </p>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-medium text-blue-900 mb-2">Pricing Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">
                  {RENEWAL_DURATIONS.find(d => d.months === duration)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Period:</span>
                <span className="font-medium">
                  {formatDate(nextPeriodStart, 'MMM dd')} - {formatDate(nextPeriodEnd, 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Base Price:</span>
                <span className="font-medium">{formatCurrency(subscription.amount * duration, subscription.currency)}</span>
              </div>
              {getSavings() > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount ({getDiscountPercentage(duration)}%):</span>
                  <span className="font-medium">-{formatCurrency(getSavings(), subscription.currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t text-base">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-blue-900">{formatCurrency(calculateTotal(), subscription.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label>Payment Method *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setMethod('TRANSFER')}
                className={`p-3 border-2 rounded-lg text-left transition-all justify-start h-auto ${
                  method === 'TRANSFER' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Bank Transfer</span>
                </div>
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setMethod('STRIPE')}
                className={`p-3 border-2 rounded-lg text-left transition-all justify-start h-auto ${
                  method === 'STRIPE' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Stripe</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <Label htmlFor="transactionId">
              Transaction ID *
              <span className="text-gray-500 text-sm font-normal ml-2">
                {method === 'STRIPE' ? '(e.g., txn_1234567890)' : '(Bank reference number)'}
              </span>
            </Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder={method === 'STRIPE' ? 'txn_1234567890' : 'BANK-REF-123'}
              className={errors.transactionId ? 'border-red-500' : ''}
            />
            {errors.transactionId && (
              <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-4 h-4" />
                {errors.transactionId}
              </p>
            )}
          </div>

          {/* Reference Number */}
          <div>
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="REF-2025-001"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${duration} month${duration > 1 ? 's' : ''} subscription renewal - ${formatDate(new Date(), 'MMMM yyyy')}`}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : 'Process Renewal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
