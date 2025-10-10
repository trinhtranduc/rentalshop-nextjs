'use client'

import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Building,
  Package,
  FileText,
  User,
  Receipt,
  RotateCcw,
  Download
} from 'lucide-react';

interface PaymentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: any | null;
  onProcessPayment?: (paymentId: number) => void;
  onRefundPayment?: (paymentId: number) => void;
  onDownloadReceipt?: (paymentId: number) => void;
}

export const PaymentDetailDialog: React.FC<PaymentDetailDialogProps> = ({
  open,
  onOpenChange,
  payment,
  onProcessPayment,
  onRefundPayment,
  onDownloadReceipt
}) => {
  if (!payment) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { color: 'bg-action-success/10 text-action-success', icon: CheckCircle, text: 'Completed' },
      'pending': { color: 'bg-action-warning/10 text-action-warning', icon: Clock, text: 'Pending' },
      'failed': { color: 'bg-action-danger/10 text-action-danger', icon: XCircle, text: 'Failed' },
      'refunded': { color: 'bg-text-tertiary/10 text-text-tertiary', icon: AlertCircle, text: 'Refunded' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const methodConfig = {
      'credit_card': CreditCard,
      'bank_transfer': DollarSign,
      'paypal': DollarSign,
      'stripe': CreditCard
    };
    
    const Icon = methodConfig[method as keyof typeof methodConfig] || CreditCard;
    return <Icon className="w-4 h-4" />;
  };

  const getPaymentMethodText = (method: string) => {
    const methodConfig = {
      'credit_card': 'Credit Card',
      'bank_transfer': 'Bank Transfer',
      'paypal': 'PayPal',
      'stripe': 'Stripe'
    };
    
    return methodConfig[method as keyof typeof methodConfig] || method;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Payment Details
              </DialogTitle>
              <DialogDescription className="text-sm text-text-secondary mt-1">
                View payment information and transaction details
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {onDownloadReceipt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownloadReceipt(payment.id)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Receipt
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Payment Overview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Payment Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Payment ID:</span>
                    <span className="text-sm text-gray-900">#{payment.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Amount:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Method:</span>
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.method)}
                      <span className="text-sm text-gray-900">
                        {getPaymentMethodText(payment.method)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="text-sm text-gray-900">{formatDate(payment.createdAt)}</span>
                  </div>
                  {payment.processedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Processed:</span>
                      <span className="text-sm text-gray-900">{formatDate(payment.processedAt)}</span>
                    </div>
                  )}
                  {payment.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Updated:</span>
                      <span className="text-sm text-gray-900">{formatDate(payment.updatedAt)}</span>
                    </div>
                  )}
                  {payment.transactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                      <span className="text-sm text-gray-900 font-mono">{payment.transactionId}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Merchant Information */}
          {payment.subscription?.merchant && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Merchant Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Merchant Name:</span>
                      <span className="text-sm text-gray-900">{payment.subscription.merchant.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <span className="text-sm text-gray-900">{payment.subscription.merchant.email}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Merchant ID:</span>
                      <span className="text-sm text-gray-900">#{payment.subscription.merchant.id}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Information */}
          {payment.subscription?.plan && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Subscription Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Plan:</span>
                      <span className="text-sm text-gray-900">{payment.subscription.plan.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Plan Price:</span>
                      <span className="text-sm text-gray-900">
                        {formatCurrency(payment.subscription.plan.price, payment.subscription.plan.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Plan Variant:</span>
                      <span className="text-sm text-gray-900">
                        {payment.subscription.planVariant?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Subscription Status:</span>
                      <Badge variant="outline" className="text-xs">
                        {payment.subscription.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Additional Information
              </h3>
              <div className="space-y-4">
                {payment.invoiceNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Invoice Number:</span>
                    <span className="text-sm text-gray-900 font-mono">{payment.invoiceNumber}</span>
                  </div>
                )}
                {payment.description && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-600">Description:</span>
                    <span className="text-sm text-gray-900 max-w-xs text-right">{payment.description}</span>
                  </div>
                )}
                {payment.failureReason && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-red-600">Failure Reason:</span>
                    <span className="text-sm text-red-600 max-w-xs text-right">{payment.failureReason}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {payment.status === 'pending' && onProcessPayment && (
              <Button
                onClick={() => onProcessPayment(payment.id)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Process Payment
              </Button>
            )}
            {payment.status === 'completed' && onRefundPayment && (
              <Button
                variant="outline"
                onClick={() => onRefundPayment(payment.id)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <RotateCcw className="w-4 h-4" />
                Refund Payment
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
