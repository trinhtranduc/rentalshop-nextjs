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
  Textarea
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/ui';
import { Calendar, DollarSign } from 'lucide-react';
import type { Subscription } from '@rentalshop/types';

interface SubscriptionExtendDialogProps {
  subscription: Subscription | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subscription: Subscription, data: {
    newEndDate: Date;
    amount: number;
    method: string;
    description?: string;
  }) => void;
  loading?: boolean;
}

const EXTENSION_METHODS = [
  { value: 'MANUAL_EXTENSION', label: 'Manual Extension' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'ADMIN_EXTENSION', label: 'Admin Extension' },
  { value: 'COMPENSATION', label: 'Compensation' }
];

export function SubscriptionExtendDialog({
  subscription,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}: SubscriptionExtendDialogProps) {
  const [extensionPeriod, setExtensionPeriod] = useState<1 | 3 | 6 | 12>(1);
  const [startDate, setStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MANUAL_EXTENSION');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!subscription || !newEndDate) return;
    
    // Validate amount (allow 0 for free extensions, but not empty)
    if (amount === '' || amount === undefined) {
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return;
    }
    
    const calculatedEndDate = new Date(newEndDate.includes('T') ? newEndDate : newEndDate + 'T23:59:59');
    
    const extensionData = {
      newEndDate: calculatedEndDate,
      amount: parsedAmount,
      method,
      description: description.trim() || undefined
    };
    
    onConfirm(subscription, extensionData);
  };

  const handleClose = () => {
    setExtensionPeriod(1);
    setStartDate('');
    setNewEndDate('');
    setAmount('');
    setMethod('MANUAL_EXTENSION');
    setDescription('');
    onClose();
  };

  // Initialize start date when dialog opens
  useEffect(() => {
    if (isOpen && !startDate && subscription) {
      const defaultDate = subscription.currentPeriodEnd 
        ? new Date(subscription.currentPeriodEnd)
        : new Date();
      defaultDate.setHours(0, 0, 0, 0);
      setStartDate(defaultDate.toISOString().slice(0, 16));
    }
  }, [isOpen, startDate, subscription]);

  // Calculate new end date when period or start date changes
  useEffect(() => {
    if (!subscription || !startDate) return;
      
    const baseDate = new Date(startDate);
      const calculated = new Date(baseDate);
      const originalDay = baseDate.getDate();
      
      if (extensionPeriod === 1) {
        calculated.setMonth(calculated.getMonth() + 1);
        if (calculated.getDate() !== originalDay) {
          calculated.setDate(1);
          calculated.setMonth(calculated.getMonth() + 1);
          calculated.setDate(0);
        }
      } else if (extensionPeriod === 3) {
        calculated.setMonth(calculated.getMonth() + 3);
        if (calculated.getDate() !== originalDay) {
          calculated.setDate(1);
          calculated.setMonth(calculated.getMonth() + 1);
          calculated.setDate(0);
        }
      } else if (extensionPeriod === 6) {
        calculated.setMonth(calculated.getMonth() + 6);
        if (calculated.getDate() !== originalDay) {
          calculated.setDate(1);
          calculated.setMonth(calculated.getMonth() + 1);
          calculated.setDate(0);
        }
      } else if (extensionPeriod === 12) {
        calculated.setFullYear(calculated.getFullYear() + 1);
        if (calculated.getDate() !== originalDay) {
          calculated.setDate(1);
          calculated.setMonth(calculated.getMonth() + 1);
          calculated.setDate(0);
        }
      }
      
    setNewEndDate(calculated.toISOString().slice(0, 16));
  }, [extensionPeriod, startDate, subscription]);

  // Calculate duration in days
  const calculateDuration = (): { days: number; months: number } | null => {
    if (!subscription || !newEndDate || !startDate) return null;
    
    const start = startDate ? new Date(startDate) : (subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date());
    const end = new Date(newEndDate.includes('T') ? newEndDate : newEndDate + 'T23:59:59');
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return { days, months: extensionPeriod };
  };

  if (!subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-action-primary" />
            Extend Subscription
          </DialogTitle>
          <DialogDescription className="mt-1">
            Extend subscription for {subscription.merchant?.name || 'Unknown Merchant'}. 
            This will update the end date and create a payment record.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Current Plan Info */}
            <div className="flex items-center justify-between p-3 bg-action-primary/10 border border-action-primary/20 rounded-lg">
                <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="font-semibold">{subscription.plan?.name || 'N/A'}</p>
                </div>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Ends on</p>
              <p className="font-semibold">
                    {subscription.currentPeriodEnd 
                      ? formatDate(subscription.currentPeriodEnd) 
                      : 'N/A'}
                  </p>
                </div>
              </div>

            {/* Extension Period */}
          <div className="space-y-2">
              <Label htmlFor="extensionPeriod" className="text-sm font-semibold">Extension Period</Label>
                    <select
                      id="extensionPeriod"
                      value={extensionPeriod}
                      onChange={(e) => setExtensionPeriod(parseInt(e.target.value) as 1 | 3 | 6 | 12)}
                      className="w-full p-2 border border-border rounded-md focus:ring-2 focus:ring-action-primary focus:border-transparent"
                    >
                      <option value={1}>1 Month</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months</option>
                    </select>
                  </div>

            {/* Start Date and End Date */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-bg-secondary border border-border rounded-lg">
                  <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-semibold">
                  Start Date & Time
                </Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full"
                    />
              </div>
                <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-semibold">
                  End Date & Time
                </Label>
                  <Input
                  id="endDate"
                    type="datetime-local"
                  value={newEndDate || ''}
                  readOnly
                  className="w-full bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const duration = calculateDuration();
                    if (!duration) return '';
                    return `${duration.months} months (${duration.days} days)`;
                  })()}
                </p>
              </div>
            </div>

            {/* Extension Amount and Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">Extension Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={subscription.amount.toString()}
                    className="w-full pl-10"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method" className="text-sm font-semibold">Extension Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                  className="w-full p-2 border border-border rounded-md focus:ring-2 focus:ring-action-primary focus:border-transparent"
              >
                {EXTENSION_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              </div>
          </div>

          {/* Summary - Show when end date is set */}
          {newEndDate && (
              <div className="space-y-4 p-4 bg-bg-secondary border border-border rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                    <p className="text-muted-foreground">New End Date</p>
                    <p className="font-semibold text-action-success">
                    {formatDate(new Date(newEndDate.includes('T') ? newEndDate : newEndDate + 'T23:59:59'))}
                      </p>
                    </div>
                    <div>
                    <p className="text-muted-foreground">Extension Amount</p>
                  <p className="font-semibold">
                        {amount 
                          ? formatCurrency(parseFloat(amount), (subscription.currency || subscription.plan?.currency || 'USD') as any)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                {/* Description */}
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Reason for extension..."
                    rows={2}
                    className="w-full"
                  />
                </div>
                </div>
          )}
          </div>
        </div>

          {/* Action Buttons */}
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !newEndDate || !amount}
          >
            {loading ? 'Extending...' : 'Extend Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
