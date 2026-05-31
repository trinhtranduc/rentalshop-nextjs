'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { List, ChevronLeft, ChevronRight } from 'lucide-react';
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
  if (!dateStr || dateStr.length < 10) return dateStr || '—';
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

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  if (!orders.length) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full mt-3 h-8 text-xs"
        onClick={() => { setPage(1); setOpen(true); }}
      >
        <List className="w-3.5 h-3.5 mr-1.5" />
        {t('orders.viewAll', { count: orders.length })}
        {conflictCount > 0 && (
          <span className="ml-1.5 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
            {conflictCount} {t('orders.conflicts')}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t('orders.dialogTitle', { name: productName || '' })}
              <span className="ml-2 text-sm font-normal text-text-secondary">
                ({orders.length})
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left text-text-secondary border-b">
                  <th className="pb-2 pr-3 font-medium">{t('orders.orderNumber')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('orders.customer')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('orders.period')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('orders.qty')}</th>
                  <th className="pb-2 font-medium">{t('orders.status')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={cn(
                      'border-b border-border/40 last:border-0',
                      order.isConflict && 'bg-amber-50'
                    )}
                  >
                    <td className="py-2 pr-3">
                      <Link
                        href={`/orders?search=${encodeURIComponent(order.orderNumber)}`}
                        className="text-blue-600 hover:underline font-medium"
                        onClick={() => setOpen(false)}
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text-primary truncate max-w-[120px]">
                      {order.customerName}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary whitespace-nowrap">
                      {formatDateDMY(order.pickupPlanAt)} – {formatDateDMY(order.returnPlanAt)}
                    </td>
                    <td className="py-2 pr-3">{order.quantity}</td>
                    <td className="py-2">
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          order.status === 'RESERVED' && 'bg-blue-100 text-blue-700',
                          order.status === 'PICKUPED' && 'bg-orange-100 text-orange-700'
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
              <span className="text-xs text-text-secondary">
                {t('orders.page', { current: page, total: totalPages })}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
