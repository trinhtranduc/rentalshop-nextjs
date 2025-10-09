"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription
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
  'MANUAL_EXTENSION',
  'PAYMENT_RECEIVED',
  'ADMIN_EXTENSION',
  'COMPENSATION',
  'OTHER'
];

export function SubscriptionExtendDialog({
  subscription,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}: SubscriptionExtendDialogProps) {
  const [newEndDate, setNewEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MANUAL_EXTENSION');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!subscription || !newEndDate || !amount) return;
    
    const extensionData = {
      newEndDate: new Date(newEndDate),
      amount: parseFloat(amount),
      method,
      description: description.trim() || undefined
    };
    
    onConfirm(subscription, extensionData);
  };

  const handleClose = () => {
    setNewEndDate('');
    setAmount('');
    setMethod('MANUAL_EXTENSION');
    setDescription('');
    onClose();
  };

  if (!subscription) return null;

  const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
  const minDate = new Date().toISOString().split('T')[0];
  const suggestedEndDate = new Date(currentEndDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Extend Subscription
          </DialogTitle>
          <DialogDescription>
            Extend subscription for {subscription.merchant?.name || 'Unknown Merchant'}. 
            This will update the end date and create a payment record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Subscription Info */}
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Plan</Label>
                  <p className="text-sm font-medium">{subscription.plan?.name || 'Unknown Plan'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Current Amount</Label>
                  <p className="text-sm font-medium">
                    {formatCurrency(subscription.amount, subscription.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Current End Date</Label>
                  <p className="text-sm">{formatDate(subscription.endDate!)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <p className="text-sm">{subscription.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extension Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newEndDate">New End Date *</Label>
                <Input
                  id="newEndDate"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  min={minDate}
                  placeholder={suggestedEndDate}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: {suggestedEndDate} (30 days from current end date)
                </p>
              </div>
              <div>
                <Label htmlFor="amount">Extension Amount *</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={subscription.amount.toString()}
                    className="pl-10"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current amount: {formatCurrency(subscription.amount, subscription.currency)}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="method">Extension Method *</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXTENSION_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Reason for extension..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Extension Preview */}
          {newEndDate && amount && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Extension Preview:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Current End:</span> {formatDate(subscription.endDate!)}
                    </div>
                    <div>
                      <span className="font-medium">New End:</span> {formatDate(new Date(newEndDate))}
                    </div>
                    <div>
                      <span className="font-medium">Extension Amount:</span> {formatCurrency(parseFloat(amount) || 0, subscription.currency)}
                    </div>
                    <div>
                      <span className="font-medium">Method:</span> {method.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
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
