'use client'

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Pagination,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  TableSkeleton
} from '../../../ui';
import { 
  Eye, 
  Edit, 
  Building,
  MoreVertical,
  Ban,
  X,
  RefreshCw
} from 'lucide-react';
import type { Subscription, Plan, Merchant, BillingInterval } from '@rentalshop/types';
import { SubscriptionViewDialog } from './SubscriptionViewDialog';
import { SubscriptionExtendDialog } from './SubscriptionExtendDialog';
import { SubscriptionChangePlanDialog } from './SubscriptionChangePlanDialog';
import { SubscriptionEditDialog } from './SubscriptionEditDialog';

interface SubscriptionListProps {
  subscriptions?: Subscription[];
  plans?: Plan[];
  merchants?: Merchant[];
  onView?: (subscription: Subscription) => void;
  onEdit?: (subscription: Subscription) => void;
  onDelete?: (subscription: Subscription) => void;
  onExtend?: (subscription: Subscription) => void;
  onCancel?: (subscription: Subscription, reason: string) => void;
  onSuspend?: (subscription: Subscription, reason: string) => void;
  onReactivate?: (subscription: Subscription) => void;
  onChangePlan?: (subscription: Subscription, newPlanId: number, interval: BillingInterval) => void;
  loading?: boolean;
  total?: number;
  limit?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function SubscriptionList({
  subscriptions = [],
  plans = [],
  merchants = [],
  onView,
  onEdit,
  onDelete,
  onExtend,
  onCancel,
  onSuspend,
  onReactivate,
  onChangePlan,
  loading = false,
  total = 0,
  limit = 20,
  currentPage = 1,
  onPageChange
}: SubscriptionListProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  
  // Dialog states
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  
  // Use subscriptions directly (filtering handled by page)
  const filteredSubscriptions = subscriptions;

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'trial': 'trial',
      'active': 'active',
      'past_due': 'warning',
      'cancelled': 'cancelled',
      'paused': 'warning'
    };

    const mappedStatus = statusMap[status as keyof typeof statusMap] || status.toLowerCase();
    return <StatusBadge status={mappedStatus} />;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const isExpiringSoon = (endDate: string | Date | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (endDate: string | Date | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  // Dialog handlers
  const handleView = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowViewDialog(true);
  };

  const handleEdit = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowEditDialog(true);
    setShowViewDialog(false); // Close the view dialog
  };

  const handleEditSave = async (data: any) => {
    if (onEdit) {
      await onEdit(data);
    }
    setShowEditDialog(false);
  };

  const handleCancel = (subscription: Subscription) => {
    onCancel?.(subscription, ''); // Reason will be collected in the confirmation dialog
    setShowViewDialog(false); // Close the view dialog
  };

  const handleExtend = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowExtendDialog(true);
    setShowViewDialog(false); // Close the view dialog
  };

  const handleChangePlan = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowChangePlanDialog(true);
    setShowViewDialog(false); // Close the view dialog
  };



  const handleExtendConfirm = (subscription: Subscription, data: any) => {
    onExtend?.(subscription);
    setShowExtendDialog(false);
    setShowViewDialog(false); // Close the view dialog
    setSelectedSubscription(null);
  };

  const handleChangePlanConfirm = (subscription: Subscription, newPlanId: number, interval: BillingInterval) => {
    onChangePlan?.(subscription, newPlanId, interval);
    setShowChangePlanDialog(false);
    setShowViewDialog(false); // Close the view dialog
    setSelectedSubscription(null);
  };

  const canCancel = (subscription: Subscription) => {
    const status = String(subscription.status).toLowerCase();
    return ['active', 'trial'].includes(status);
  };
  const canExtend = (subscription: Subscription) => {
    const status = String(subscription.status).toLowerCase();
    return ['active', 'trial', 'past_due'].includes(status);
  };
  const canChangePlan = (subscription: Subscription) => {
    const status = String(subscription.status).toLowerCase();
    return ['active', 'trial'].includes(status);
  };
  const canReactivate = (subscription: Subscription) => {
    const status = String(subscription.status).toLowerCase();
    return ['cancelled', 'paused'].includes(status);
  };

  return (
    <>
      <Card className="shadow-sm border-border flex flex-col h-full">
        <CardContent className="p-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={7} />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-text-tertiary">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium mb-2">No subscriptions found</h3>
              <p className="text-sm">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          </div>
        ) : (
          /* Table with scroll - same structure as MerchantTable */
          <div className="flex-1 overflow-auto h-full">
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
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Next Billing
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                {/* Table Body */}
                <tbody className="bg-bg-card divide-y divide-border">
                  {filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-bg-secondary transition-colors">
                      {/* Merchant with Icon */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-action-primary to-brand-primary flex items-center justify-center">
                            <Building className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {subscription.merchant?.name || 'Unknown Merchant'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Plan */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-text-primary">
                          {subscription.plan?.name || 'Unknown Plan'}
                        </div>
                      </td>
                      
                      {/* Amount */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {formatCurrency(subscription.amount, 'USD')}
                          </div>
                        </div>
                      </td>
                      
                      {/* Period */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-text-primary">
                          {(() => {
                            const interval = subscription.billingInterval;
                            if (interval === 'monthly' || interval === 'month') return 'Monthly';
                            if (interval === 'quarterly' || interval === 'quarter') return 'Quarterly';
                            if (interval === 'annual' || interval === 'yearly' || interval === 'year') return 'Yearly';
                            if (interval === 'semi_annual' || interval === 'semiAnnual' || interval === 'sixMonths') return 'Semi-Annual';
                            return 'Custom';
                          })()}
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(subscription.status)}
                          {isExpiringSoon(subscription.currentPeriodEnd) && (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                              Expiring
                            </Badge>
                          )}
                        </div>
                      </td>
                      
                      {/* Next Billing */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-text-primary">
                          {formatDate(subscription.currentPeriodEnd)}
                        </div>
                      </td>
                      
                      {/* Actions - Dropdown Menu */}
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setOpenMenuId(openMenuId === subscription.id ? null : subscription.id)}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end"
                            open={openMenuId === subscription.id}
                            onOpenChange={(open: boolean) => setOpenMenuId(open ? subscription.id : null)}
                            className="z-50"
                          >
                            <DropdownMenuItem 
                              onClick={() => {
                                handleView(subscription);
                                setOpenMenuId(null);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                onEdit?.(subscription);
                                setOpenMenuId(null);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {canReactivate(subscription) && onReactivate && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    onReactivate(subscription);
                                    setOpenMenuId(null);
                                  }}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 focus:text-green-700 focus:bg-green-50 dark:hover:bg-green-950 dark:focus:bg-green-950"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Reactivate Subscription
                                </DropdownMenuItem>
                              </>
                            )}
                            {canCancel(subscription) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    handleCancel(subscription);
                                    setOpenMenuId(null);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Subscription
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
        )}
        </CardContent>
      </Card>

      {/* Pagination Section - Client pattern */}
      {onPageChange && total > 0 && total > limit && (
        <div className="flex-shrink-0 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(total / limit)}
            total={total}
            limit={limit}
            onPageChange={onPageChange}
            itemName="subscriptions"
          />
        </div>
      )}

      {/* Dialogs */}
      <SubscriptionViewDialog
        subscription={selectedSubscription}
        isOpen={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onExtend={handleExtend}
        onSuspend={onSuspend}
        onReactivate={onReactivate}
        onChangePlan={handleChangePlan}
      />

      <SubscriptionEditDialog
        subscription={selectedSubscription}
        plans={plans}
        merchants={merchants}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleEditSave}
        loading={loading}
      />


      <SubscriptionExtendDialog
        subscription={selectedSubscription}
        isOpen={showExtendDialog}
        onClose={() => setShowExtendDialog(false)}
        onConfirm={handleExtendConfirm}
        loading={loading}
      />

      <SubscriptionChangePlanDialog
        subscription={selectedSubscription}
        plans={plans}
        isOpen={showChangePlanDialog}
        onClose={() => setShowChangePlanDialog(false)}
        onConfirm={handleChangePlanConfirm}
        loading={loading}
      />
    </>
  );
}
