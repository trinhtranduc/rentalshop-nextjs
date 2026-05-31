'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { List, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rentalshop/ui';
import { useAvailabilityTranslations } from '@rentalshop/hooks';
import { cn } from '../../../lib/cn';
import type { ActiveOrder } from './types';

const PAGE_SIZE = 10;

/** Format YYYY-MM-DD to dd/mm/yyyy */
function formatDateDMY(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

interface ActiveOrdersListProps {
  orders: ActiveOrder[];
  productName?: string;
}

export const ActiveOrdersList: React.FC<ActiveOrdersListProps> = ({
  orders,
  productName,
}) => {
  const t = useAvailabilityTranslations();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const conflictCount = orders.filter((o) => o.isConflict).length;
  const totalPages = Math.ceil(orders.length / PAGE_SIZE);

  // Sort: conflicts first, then by pickup date desc
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (a.isConflict && !b.isConflict) return -1;
      if (!a.isConflict && b.isConflict) return 1;
      return (b.pickupPlanAt || '').localeCompare(a.pickupPlanAt || '');
    });
  }, [orders]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedOrders.slice(start, start + PAGE_SIZE);
  }, [sortedOrders, page]);

  if (!orders.length) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full mt-3 h-9 text-sm font-medium"
        onClick={() => { setPage(1); setOpen(true); }}
      >
        <List className="w-4 h-4 mr-2" />
        {t('orders.viewAll', { count: orders.length })}
        {conflictCount > 0 && (
          <span className="ml-2 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-xs font-medium">
            {conflictCount} {t('orders.conflicts')}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[70vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold">
              {t('orders.dialogTitle', { name: productName || '' })}
              <span className="ml-2 text-sm font-normal text-text-secondary">
                ({orders.length} {t('orders.ordersLabel')})
              </span>
            </DialogTitle>
            {conflictCount > 0 && (
              <p className="text-sm text-amber-700 mt-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {t('orders.conflictNote', { count: conflictCount })}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left pb-3 pr-4 font-semibold text-text-primary text-xs uppercase tracking-wide">{t('orders.orderNumber')}</th>
                  <th className="text-left pb-3 pr-4 font-semibold text-text-primary text-xs uppercase tracking-wide">{t('orders.customer')}</th>
                  <th className="text-left pb-3 pr-4 font-semibold text-text-primary text-xs uppercase tracking-wide">{t('orders.period')}</th>
                  <th className="text-center pb-3 pr-4 font-semibold text-text-primary text-xs uppercase tracking-wide">{t('orders.qty')}</th>
                  <th className="text-left pb-3 font-semibold text-text-primary text-xs uppercase tracking-wide">{t('orders.status')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={cn(
                      'border-b border-border/50 last:border-0 transition-colors',
                      order.isConflict
                        ? 'bg-amber-50/80 hover:bg-amber-100/60'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <td className="py-4 pr-4">
                      <Link
                        href={`/orders?search=${encodeURIComponent(order.orderNumber)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        onClick={() => setOpen(false)}
                      >
                        {order.orderNumber}
                      </Link>
                      {order.isConflict && (
                        <span className="ml-2 text-[10px] text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded font-medium">
                          {t('orders.conflictBadge')}
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-text-primary">
                      {order.customerName}
                    </td>
                    <td className="py-4 pr-4 text-text-secondary whitespace-nowrap">
                      {formatDateDMY(order.pickupPlanAt)} – {formatDateDMY(order.returnPlanAt)}
                    </td>
                    <td className="py-4 pr-4 text-center font-medium">{order.quantity}</td>
                    <td className="py-4">
                      <span
                        className={cn(
                          'inline-flex items-center text-xs px-2 py-1 rounded-full font-medium',
                          order.status === 'RESERVED' && 'bg-blue-100 text-blue-700',
                          order.status === 'PICKUPED' && 'bg-orange-100 text-orange-700'
                        )}
                      >
                        {order.status === 'RESERVED' ? t('orders.statusReserved') : t('orders.statusPickuped')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-gray-50/50">
            <span className="text-sm text-text-secondary">
              {t('orders.page', { current: page, total: totalPages || 1 })}
            </span>
            {totalPages > 1 && (
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
