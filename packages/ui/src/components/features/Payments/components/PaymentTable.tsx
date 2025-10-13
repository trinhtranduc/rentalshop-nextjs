'use client';

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  StatusBadge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../ui';
import { 
  Eye, 
  Edit,
  Download,
  CreditCard,
  MoreVertical,
  RefreshCcw
} from 'lucide-react';

interface Payment {
  id: number;
  subscriptionId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId?: string;
  invoiceNumber?: string;
  description?: string;
  failureReason?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    merchantId: string;
    planId: string;
    status: string;
    amount: number;
    currency: string;
    merchant?: {
      id: string;
      name: string;
      email: string;
    };
    plan?: {
      id: string;
      name: string;
      price: number;
      currency: string;
    };
    billingCycle?: {
      id: string;
      name: string;
      months: number;
      discount: number;
    };
  };
}

interface PaymentTableProps {
  payments: Payment[];
  onView?: (payment: Payment) => void;
  onDownloadReceipt?: (payment: Payment) => void;
  onRefund?: (payment: Payment) => void;
  loading?: boolean;
}

export function PaymentTable({ 
  payments, 
  onView,
  onDownloadReceipt,
  onRefund,
  loading = false 
}: PaymentTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'active',
      'pending': 'warning',
      'failed': 'danger',
      'refunded': 'inactive'
    };
    
    return <StatusBadge status={statusMap[status.toLowerCase()] || 'inactive'} />;
  };

  const getPaymentMethodText = (method: string) => {
    const methodConfig: Record<string, string> = {
      'credit_card': 'Credit Card',
      'bank_transfer': 'Bank Transfer',
      'paypal': 'PayPal',
      'stripe': 'Stripe'
    };
    
    return methodConfig[method.toLowerCase()] || method;
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          <div className="animate-pulse space-y-4 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-bg-tertiary rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="shadow-sm border-border">
        <CardContent className="text-center py-12">
          <div className="text-text-tertiary">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-lg font-medium mb-2">No payments found</h3>
            <p className="text-sm">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border flex flex-col h-full">
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {/* Table with scroll */}
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full">
            {/* Table Header - Sticky */}
            <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="bg-bg-card divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-bg-secondary transition-colors">
                  {/* Merchant with Icon */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-action-primary to-brand-primary flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {payment.subscription?.merchant?.name || 'Unknown Merchant'}
                        </div>
                        {payment.invoiceNumber && (
                          <div className="text-xs text-text-tertiary">
                            INV: {payment.invoiceNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Plan */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {payment.subscription?.plan?.name || 'Unknown Plan'}
                    </div>
                  </td>
                  
                  {/* Amount */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-text-primary">
                      {formatCurrency(payment.amount, payment.currency)}
                    </div>
                  </td>
                  
                  {/* Payment Method */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {getPaymentMethodText(payment.method)}
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4">
                    {getStatusBadge(payment.status)}
                  </td>
                  
                  {/* Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {formatDate(payment.createdAt)}
                    </div>
                  </td>
                  
                  {/* Actions - Dropdown Menu */}
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setOpenMenuId(openMenuId === payment.id ? null : payment.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        open={openMenuId === payment.id}
                        onOpenChange={(open: boolean) => setOpenMenuId(open ? payment.id : null)}
                      >
                        {onView && (
                          <DropdownMenuItem 
                            onClick={() => {
                              onView(payment);
                              setOpenMenuId(null);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onDownloadReceipt && (
                          <DropdownMenuItem 
                            onClick={() => {
                              onDownloadReceipt(payment);
                              setOpenMenuId(null);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Receipt
                          </DropdownMenuItem>
                        )}
                        {onRefund && payment.status === 'completed' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                onRefund(payment);
                                setOpenMenuId(null);
                              }}
                              className="text-action-danger focus:text-action-danger"
                            >
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Refund Payment
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

