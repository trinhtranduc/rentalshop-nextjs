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
import { Calendar, DollarSign, Clock } from 'lucide-react';
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
  const [extensionType, setExtensionType] = useState<'date' | 'period'>('period');
  const [newEndDate, setNewEndDate] = useState('');
  const [extensionPeriod, setExtensionPeriod] = useState<1 | 3 | 6 | 12>(1);
  const [startDate, setStartDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MANUAL_EXTENSION');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!subscription) return;
    
    let calculatedEndDate: Date;
    
    if (extensionType === 'period') {
      // Calculate end date based on period from start date or current end date
      const baseDate = startDate 
        ? new Date(startDate) 
        : (subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date());
      
      calculatedEndDate = new Date(baseDate);
      if (extensionPeriod === 1) {
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
      } else if (extensionPeriod === 3) {
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 3);
      } else if (extensionPeriod === 6) {
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 6);
      } else if (extensionPeriod === 12) {
        calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
      }
    } else {
      // Use manually entered date
      if (!newEndDate) return;
      calculatedEndDate = new Date(newEndDate);
    }
    
    if (!amount) return;
    
    const extensionData = {
      newEndDate: calculatedEndDate,
      amount: parseFloat(amount),
      method,
      description: description.trim() || undefined
    };
    
    onConfirm(subscription, extensionData);
  };

  const handleClose = () => {
    setExtensionType('period');
    setNewEndDate('');
    setExtensionPeriod(1);
    setStartDate('');
    setAmount('');
    setMethod('MANUAL_EXTENSION');
    setDescription('');
    onClose();
  };

  // Calculate new end date when period or start date changes
  useEffect(() => {
    if (extensionType === 'period' && subscription) {
      const baseDate = startDate 
        ? new Date(startDate) 
        : (subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date());
      
      const calculated = new Date(baseDate);
      if (extensionPeriod === 1) {
        calculated.setMonth(calculated.getMonth() + 1);
      } else if (extensionPeriod === 3) {
        calculated.setMonth(calculated.getMonth() + 3);
      } else if (extensionPeriod === 6) {
        calculated.setMonth(calculated.getMonth() + 6);
      } else if (extensionPeriod === 12) {
        calculated.setFullYear(calculated.getFullYear() + 1);
      }
      
      setNewEndDate(calculated.toISOString().split('T')[0]);
    }
  }, [extensionType, extensionPeriod, startDate, subscription]);

  // Calculate duration in days and months
  const calculateDuration = (startDateStr: string | null, endDateStr: string | null): { days: number; months: number } | null => {
    if (!startDateStr || !endDateStr) return null;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.round((days / 30) * 10) / 10;
    
    return { days, months };
  };

  // Get effective start date for extension
  const getEffectiveStartDate = (): string | null => {
    if (extensionType === 'period') {
      if (startDate) {
        return startDate;
      }
      return subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0] : null;
    } else {
      // For date-based extension, start date is always currentPeriodEnd
      return subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0] : null;
    }
  };

  if (!subscription) return null;

  const currentEndDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date();
  const minDate = new Date().toISOString().split('T')[0];
  const suggestedEndDate = new Date(currentEndDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-700" />
            Extend Subscription
          </DialogTitle>
          <DialogDescription>
            Extend subscription for {subscription.merchant?.name || 'Unknown Merchant'}. 
            This will update the end date and create a payment record.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Current Plan Info - Simplified */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className="font-semibold">{subscription.plan?.name || 'N/A'}</p>
                </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Ends on</p>
              <p className="font-semibold">
                    {subscription.currentPeriodEnd 
                      ? formatDate(subscription.currentPeriodEnd) 
                      : 'N/A'}
                  </p>
                </div>
              </div>

          {/* Extension Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Extension Method</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="period"
                    checked={extensionType === 'period'}
                    onChange={(e) => setExtensionType(e.target.value as 'period' | 'date')}
                    className="w-4 h-4"
                  />
                <span className="text-sm">By Period</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="date"
                    checked={extensionType === 'date'}
                    onChange={(e) => setExtensionType(e.target.value as 'period' | 'date')}
                    className="w-4 h-4"
                  />
                <span className="text-sm">By Date</span>
                </label>
              </div>
            </div>

            {/* Period-based Extension */}
            {extensionType === 'period' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="extensionPeriod">Extension Period *</Label>
                    <select
                      id="extensionPeriod"
                      value={extensionPeriod}
                      onChange={(e) => setExtensionPeriod(parseInt(e.target.value) as 1 | 3 | 6 | 12)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1 Month</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date & Time (Optional)</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      {startDate 
                        ? `Starts: ${formatDate(new Date(startDate))}`
                        : `Default: ${subscription.currentPeriodEnd ? formatDate(new Date(subscription.currentPeriodEnd)) : 'N/A'}`}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calculatedEndDate">New End Date & Time</Label>
                  <Input
                    id="calculatedEndDate"
                    type="datetime-local"
                    value={newEndDate ? (() => {
                      // Convert date string to datetime-local format
                      const date = new Date(newEndDate + 'T23:59:59');
                      return date.toISOString().slice(0, 16);
                    })() : ''}
                    readOnly
                    className="w-full bg-gray-100"
                  />
                </div>
              </div>
            )}

            {/* Date-based Extension */}
            {extensionType === 'date' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="newEndDate">New End Date & Time *</Label>
                  <Input
                    id="newEndDate"
                    type="datetime-local"
                    value={newEndDate ? (() => {
                      // If newEndDate is already in datetime format, use it
                      // Otherwise convert date string to datetime-local
                      if (newEndDate.includes('T')) {
                        return newEndDate.slice(0, 16);
                      }
                      const date = new Date(newEndDate + 'T23:59:59');
                      return date.toISOString().slice(0, 16);
                    })() : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value;
                      if (dateValue) {
                        // Store as datetime string for consistency
                        setNewEndDate(dateValue);
                      } else {
                        setNewEndDate('');
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="amount">Extension Amount *</Label>
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
                <p className="text-xs text-gray-500">
                  Current: {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)}/month
                </p>
              </div>
              <div className="space-y-2">
              <Label htmlFor="method">Extension Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXTENSION_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason for extension..."
                rows={2}
                className="w-full"
              />
          </div>

          {/* Summary - Show when end date is set */}
          {newEndDate && (
            <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                  <p className="text-gray-600">Current End Date</p>
                  <p className="font-semibold">
                        {subscription.currentPeriodEnd 
                          ? formatDate(subscription.currentPeriodEnd) 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                  <p className="text-gray-600">New End Date</p>
                  <p className="font-semibold text-green-700">
                    {formatDate(new Date(newEndDate.includes('T') ? newEndDate : newEndDate + 'T23:59:59'))}
                      </p>
                    </div>
                    <div>
                  <p className="text-gray-600">Days Extended</p>
                  <p className="font-semibold">
                        {subscription.currentPeriodEnd 
                      ? Math.ceil((new Date(newEndDate.includes('T') ? newEndDate : newEndDate + 'T23:59:59').getTime() - new Date(subscription.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24))
                          : 'N/A'} days
                      </p>
                    </div>
                    <div>
                  <p className="text-gray-600">Extension Amount</p>
                  <p className="font-semibold">
                        {amount 
                          ? formatCurrency(parseFloat(amount), (subscription.currency || subscription.plan?.currency || 'USD') as any)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-4 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !newEndDate || !amount || (extensionType === 'period' && !extensionPeriod)}
          >
            {loading ? 'Extending...' : 'Extend Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
