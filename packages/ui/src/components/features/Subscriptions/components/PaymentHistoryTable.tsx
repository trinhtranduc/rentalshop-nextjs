'use client'

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Pagination
} from '@rentalshop/ui';
import { formatDate, formatCurrency } from '@rentalshop/utils';
import { Download, FileText, Eye, Filter } from 'lucide-react';

interface Payment {
  id: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  description?: string;
  createdAt: Date;
  invoiceNumber?: string;
}

interface PaymentHistoryTableProps {
  subscriptionId: number;
  payments: Payment[];
  loading?: boolean;
  onViewPayment?: (payment: Payment) => void;
  onDownloadInvoice?: (payment: Payment) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function PaymentHistoryTable({
  subscriptionId,
  payments,
  loading = false,
  onViewPayment,
  onDownloadInvoice,
  pagination
}: PaymentHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      COMPLETED: { variant: 'success', label: 'Paid' },
      PENDING: { variant: 'warning', label: 'Pending' },
      FAILED: { variant: 'danger', label: 'Failed' },
      REFUNDED: { variant: 'secondary', label: 'Refunded' }
    };

    const config = statusMap[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'STRIPE':
        return '💳';
      case 'TRANSFER':
        return '🏦';
      case 'MANUAL':
        return '✏️';
      default:
        return '💰';
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Amount', 'Method', 'Status', 'Transaction ID'].join(','),
      ...payments.map(p => [
        formatDate(p.createdAt, 'MMM dd, yyyy'),
        p.amount,
        p.method,
        p.status,
        p.transactionId
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${subscriptionId}-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading payment history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>💳 Payment History</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No payment history yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-gray-600">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Transaction ID</th>
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 text-sm">
                        {formatDate(new Date(payment.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-4 text-sm font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{getMethodIcon(payment.method)}</span>
                          <span className="capitalize">
                            {payment.method.toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-sm">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="py-4 text-sm font-mono">
                        {payment.transactionId}
                      </td>
                      <td className="py-4 text-sm">
                        {payment.invoiceNumber ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownloadInvoice?.(payment)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            {payment.invoiceNumber}
                          </Button>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 text-sm text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewPayment?.(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="mt-6">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={Math.ceil(pagination.total / pagination.limit)}
                  onPageChange={pagination.onPageChange}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

