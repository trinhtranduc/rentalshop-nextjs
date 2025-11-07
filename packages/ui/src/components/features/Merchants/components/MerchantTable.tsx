import React, { useState } from 'react';
import { 
  Card, 
  CardContent,
  Button,
  StatusBadge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@rentalshop/ui/base';
import { 
  Eye, 
  Edit,
  MoreVertical
} from 'lucide-react';
import type { Merchant } from '@rentalshop/types';

interface MerchantTableProps {
  merchants: Merchant[];
  onMerchantAction: (action: string, merchantId: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}



export function MerchantTable({ 
  merchants, 
  onMerchantAction,
  sortBy = 'name',
  sortOrder = 'asc',
  onSort
}: MerchantTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const getStatusBadge = (merchant: Merchant) => {
    if (!merchant.isActive) {
      return <StatusBadge status="inactive" type="entity" size="sm" />;
    }
    // Get status from subscription (single source of truth - always exists)
    const status = merchant.subscription?.status;
    return <StatusBadge status={status} type="subscription" size="sm" />;
  };

  if (merchants.length === 0) {
    return (
      <Card className="shadow-sm border-border">
        <CardContent className="text-center py-12">
          <div className="text-text-tertiary">
            <div className="text-4xl mb-4">🏪</div>
            <h3 className="text-lg font-medium mb-2">No merchants found</h3>
            <p className="text-sm">
              Try adjusting your filters or create some merchants to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border flex flex-col h-full">
      <CardContent className="p-0 flex-1 overflow-hidden">
        {/* Table with scroll - flex layout */}
        <div className="flex-1 overflow-auto h-full">
          <table className="w-full">
            <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Merchant Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Plan & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg-card">
              {merchants.map((merchant) => (
                <tr 
                  key={merchant.id} 
                  className="hover:bg-bg-secondary transition-colors"
                >
                  {/* Merchant Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-action-primary to-brand-primary flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {merchant.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {merchant.name}
                        </div>
                        <div className="text-sm text-text-tertiary">
                          {merchant.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Plan & Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium text-text-primary">
                        {merchant.subscription?.plan?.name || 'No Plan'}
                      </div>
                      {getStatusBadge(merchant)}
                    </div>
                  </td>

                  {/* Created At */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {merchant.createdAt 
                        ? new Date(merchant.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </div>
                  </td>

                  {/* Start Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {merchant.subscription?.currentPeriodStart 
                        ? new Date(merchant.subscription.currentPeriodStart).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : merchant.createdAt
                        ? new Date(merchant.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </div>
                  </td>

                  {/* End Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {merchant.subscription?.currentPeriodEnd 
                        ? new Date(merchant.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : merchant.lastActiveAt
                        ? new Date(merchant.lastActiveAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'No end date'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setOpenMenuId(openMenuId === merchant.id ? null : merchant.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        open={openMenuId === merchant.id}
                        onOpenChange={(open: boolean) => setOpenMenuId(open ? merchant.id : null)}
                      >
                        <DropdownMenuItem 
                          onClick={() => {
                            onMerchantAction('view', merchant.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            onMerchantAction('edit', merchant.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Merchant
                        </DropdownMenuItem>
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

export default MerchantTable;
