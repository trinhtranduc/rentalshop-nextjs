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
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription,
  Badge
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/ui';
import { Calendar, DollarSign, Clock, Info, HelpCircle } from 'lucide-react';
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

  if (!subscription) return null;

  const currentEndDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date();
  const minDate = new Date().toISOString().split('T')[0];
  const suggestedEndDate = new Date(currentEndDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [showCalculationInfo, setShowCalculationInfo] = useState(false);

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

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Current Subscription Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Current Subscription Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-600">Current Plan</Label>
                  <p className="font-medium mt-1">{subscription.plan?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Period Start</Label>
                  <p className="font-medium mt-1">
                    {subscription.currentPeriodStart 
                      ? formatDate(subscription.currentPeriodStart) 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Current End Date</Label>
                  <p className="font-medium mt-1">
                    {subscription.currentPeriodEnd 
                      ? formatDate(subscription.currentPeriodEnd) 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Days Remaining</Label>
                  <p className="font-medium mt-1">
                    {subscription.currentPeriodEnd 
                      ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                      : 'N/A'} days
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Current Amount</Label>
                  <p className="font-medium mt-1">
                    {formatCurrency(
                      subscription.amount || 0, 
                      (subscription.currency || subscription.plan?.currency || 'USD') as any
                    )}
                    /{subscription.interval || 'month'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Status</Label>
                  <p className="font-medium mt-1">
                    <Badge variant="outline">{subscription.status}</Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extension Type Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Extension Method</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="period"
                    checked={extensionType === 'period'}
                    onChange={(e) => setExtensionType(e.target.value as 'period' | 'date')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Extend by Period</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="date"
                    checked={extensionType === 'date'}
                    onChange={(e) => setExtensionType(e.target.value as 'period' | 'date')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Set Specific End Date</span>
                </label>
              </div>
            </div>

            {/* Period-based Extension */}
            {extensionType === 'period' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="extensionPeriod">Extension Period *</Label>
                    <select
                      id="extensionPeriod"
                      value={extensionPeriod}
                      onChange={(e) => setExtensionPeriod(parseInt(e.target.value) as 1 | 3 | 6 | 12)}
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1 Month</option>
                      <option value={3}>3 Months (Quarterly)</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months (Yearly)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="startDate">Start Date (Optional)</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0] : minDate}
                      className="mt-1"
                      placeholder="Leave empty to extend from current end date"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {startDate 
                        ? `Extension starts from: ${formatDate(new Date(startDate))}`
                        : `Extension starts from current end date: ${subscription.currentPeriodEnd ? formatDate(new Date(subscription.currentPeriodEnd)) : 'N/A'}`}
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="calculatedEndDate">Calculated End Date</Label>
                  <Input
                    id="calculatedEndDate"
                    type="date"
                    value={newEndDate}
                    readOnly
                    className="mt-1 bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This date is automatically calculated based on the extension period
                  </p>
                </div>
              </div>
            )}

            {/* Date-based Extension */}
            {extensionType === 'date' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <Label htmlFor="newEndDate">New End Date *</Label>
                  <Input
                    id="newEndDate"
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0] : minDate}
                    placeholder={suggestedEndDate}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: {suggestedEndDate} (30 days from current end date)
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="amount">Extension Amount *</Label>
                  <button
                    type="button"
                    onClick={() => setShowCalculationInfo(!showCalculationInfo)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="How is the extension amount calculated?"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </div>
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
                  Current amount: {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)}
                </p>
                
                {/* Calculation Info */}
                {showCalculationInfo && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-gray-700 space-y-1">
                        <p className="font-semibold text-blue-800">How Extension Amount is Calculated:</p>
                        {extensionType === 'period' ? (
                          <div className="space-y-1 ml-1">
                            <p>• <strong>Base Calculation:</strong> Current monthly amount × Extension period</p>
                            <p>• <strong>Example:</strong> If current amount is {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)}/month</p>
                            <p className="ml-4">- Extending 1 month: {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)} × 1 = {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)}</p>
                            <p className="ml-4">- Extending 3 months: {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)} × 3 = {formatCurrency(subscription.amount * 3, (subscription.plan?.currency || 'USD') as any)}</p>
                            <p>• <strong>Note:</strong> You can adjust this amount manually if needed</p>
                          </div>
                        ) : (
                          <div className="space-y-1 ml-1">
                            <p>• <strong>Manual Entry:</strong> Enter the extension amount you want to charge</p>
                            <p>• <strong>Suggested:</strong> Current monthly amount × Number of months extended</p>
                            <p>• <strong>Example:</strong> If extending 2 months from {subscription.currentPeriodEnd ? formatDate(new Date(subscription.currentPeriodEnd)) : 'current end date'}</p>
                            <p className="ml-4">Suggested amount: {formatCurrency(subscription.amount, (subscription.plan?.currency || 'USD') as any)} × 2 = {formatCurrency(subscription.amount * 2, (subscription.plan?.currency || 'USD') as any)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="method">Extension Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXTENSION_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
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

          {/* Extension Summary */}
          {newEndDate && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Extension Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-gray-600">Current End Date</Label>
                      <p className="font-medium mt-1">
                        {subscription.currentPeriodEnd 
                          ? formatDate(subscription.currentPeriodEnd) 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">New End Date</Label>
                      <p className="font-medium mt-1 text-green-700">
                        {formatDate(new Date(newEndDate))}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Days Extended</Label>
                      <p className="font-medium mt-1">
                        {subscription.currentPeriodEnd 
                          ? Math.ceil((new Date(newEndDate).getTime() - new Date(subscription.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24))
                          : 'N/A'} days
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Extension Amount</Label>
                      <p className="font-medium mt-1">
                        {amount 
                          ? formatCurrency(parseFloat(amount), (subscription.currency || subscription.plan?.currency || 'USD') as any)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {subscription.currentPeriodStart && (
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Subscription Duration:</span>
                        <span className="font-medium">
                          {Math.ceil((new Date(newEndDate).getTime() - new Date(subscription.currentPeriodStart).getTime()) / (1000 * 60 * 60 * 24))} days
                          ({Math.round((new Date(newEndDate).getTime() - new Date(subscription.currentPeriodStart).getTime()) / (1000 * 60 * 60 * 24 * 30) * 10) / 10} months)
                        </span>
                      </div>
                    </div>
                  )}

                  <Alert>
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Important Information:</p>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                          <li>Extension will update the subscription end date</li>
                          <li>A payment record will be created for the extension amount</li>
                          <li>The subscription will remain active until the new end date</li>
                          <li>Billing cycle will continue as normal after extension</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
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
