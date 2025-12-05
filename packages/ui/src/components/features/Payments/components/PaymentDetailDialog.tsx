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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Payment Details
              </DialogTitle>
              <DialogDescription className="mt-1">
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

        <div className="px-6 py-4 overflow-y-auto">
          <div className="space-y-6">
          {/* Payment Overview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-action-primary rounded-full"></span>
                Payment Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Payment ID:</span>
                    <span className="text-sm text-text-primary">#{payment.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Amount:</span>
                    <span className="text-lg font-bold text-text-primary">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Method:</span>
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.method)}
                      <span className="text-sm text-text-primary">
                        {getPaymentMethodText(payment.method)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Created:</span>
                    <span className="text-sm text-text-primary">{formatDate(payment.createdAt)}</span>
                  </div>
                  {payment.processedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Processed:</span>
                      <span className="text-sm text-text-primary">{formatDate(payment.processedAt)}</span>
                    </div>
                  )}
                  {payment.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Updated:</span>
                      <span className="text-sm text-text-primary">{formatDate(payment.updatedAt)}</span>
                    </div>
                  )}
                  {payment.transactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Transaction ID:</span>
                      <span className="text-sm text-text-primary font-mono">{payment.transactionId}</span>
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
                <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Merchant Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Merchant Name:</span>
                      <span className="text-sm text-text-primary">{payment.subscription.merchant.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Email:</span>
                      <span className="text-sm text-text-primary">{payment.subscription.merchant.email}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Merchant ID:</span>
                      <span className="text-sm text-text-primary">#{payment.subscription.merchant.id}</span>
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
                <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Subscription Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Plan:</span>
                      <span className="text-sm text-text-primary">{payment.subscription.plan.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Plan Price:</span>
                      <span className="text-sm text-text-primary">
                        {formatCurrency(payment.subscription.plan.price, payment.subscription.plan.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Plan Variant:</span>
                      <span className="text-sm text-text-primary">
                        {payment.subscription.planVariant?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Subscription Status:</span>
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
              <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Additional Information
              </h3>
              <div className="space-y-4">
                {payment.invoiceNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Invoice Number:</span>
                    <span className="text-sm text-text-primary font-mono">{payment.invoiceNumber}</span>
                  </div>
                )}
                {payment.description && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Description:</span>
                    <span className="text-sm text-text-primary max-w-xs text-right">{payment.description}</span>
                  </div>
                )}
                {payment.failureReason && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-action-danger">Failure Reason:</span>
                    <span className="text-sm text-action-danger max-w-xs text-right">{payment.failureReason}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
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
                className="flex items-center gap-2 text-action-danger hover:text-action-danger"
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
