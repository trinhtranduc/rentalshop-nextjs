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
  Textarea,
  Label,
  Alert,
  AlertDescription
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/ui';
import { AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import type { Subscription } from '@rentalshop/types';

interface SubscriptionCancelDialogProps {
  subscription: Subscription | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subscription: Subscription, reason: string) => void;
  loading?: boolean;
}

const CANCELLATION_REASONS = [
  'Customer requested cancellation',
  'Payment failed',
  'Business closure',
  'Switching to different plan',
  'Temporary suspension',
  'Other'
];

export function SubscriptionCancelDialog({
  subscription,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}: SubscriptionCancelDialogProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleSubmit = () => {
    if (!subscription) return;
    
    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason.trim()) return;
    
    onConfirm(subscription, finalReason);
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    onClose();
  };

  if (!subscription) return null;

  const isTrial = subscription.status === 'TRIAL';
  const willLoseAccess = subscription.endDate ? new Date(subscription.endDate) > new Date() : false;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Cancel subscription for {subscription.merchant?.name || 'Unknown Merchant'}. 
            This action will stop auto-renewal but preserve all data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subscription Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Plan</Label>
                  <p className="text-sm font-medium">{subscription.plan?.name || 'Unknown Plan'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Amount</Label>
                  <p className="text-sm font-medium">
                    {formatCurrency(subscription.amount, subscription.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <p className="text-sm">{subscription.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">End Date</Label>
                  <p className="text-sm">
                    {subscription.endDate ? formatDate(subscription.endDate) : 'No end date'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">What happens when you cancel:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Auto-renewal will be stopped immediately</li>
                  <li>All data will be preserved and accessible</li>
                  {willLoseAccess && (
                    <li>Access will continue until {formatDate(subscription.endDate!)}</li>
                  )}
                  {isTrial && (
                    <li>Trial access will continue until {formatDate(subscription.endDate!)}</li>
                  )}
                  <li>No further charges will be made</li>
                  <li>Subscription can be reactivated later if needed</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Cancellation Reason *</Label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a reason...</option>
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {reason === 'Other' && (
              <div>
                <Label htmlFor="customReason">Please specify *</Label>
                <Textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please provide details about the cancellation reason..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {isTrial 
                    ? `Trial ends on ${formatDate(subscription.endDate!)}`
                    : `Subscription ends on ${formatDate(subscription.endDate!)}`
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>
                  {isTrial 
                    ? 'No charges will be made (trial subscription)'
                    : `Final amount: ${formatCurrency(subscription.amount, subscription.currency)}`
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Keep Subscription
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={loading || !reason || (reason === 'Other' && !customReason.trim())}
          >
            {loading ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
