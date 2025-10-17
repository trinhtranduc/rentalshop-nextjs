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
  DropdownMenuSeparator
} from '../../../ui';
import { 
  Eye, 
  Edit, 
  Building,
  MoreVertical,
  Ban
} from 'lucide-react';
import type { Subscription, Plan, Merchant, BillingPeriod } from '@rentalshop/types';
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
  onChangePlan?: (subscription: Subscription, newPlanId: number, period: BillingPeriod) => void;
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
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
  pagination
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

  const handleChangePlanConfirm = (subscription: Subscription, newPlanId: number, period: BillingPeriod) => {
    onChangePlan?.(subscription, newPlanId, period);
    setShowChangePlanDialog(false);
    setShowViewDialog(false); // Close the view dialog
    setSelectedSubscription(null);
  };

  const canCancel = (subscription: Subscription) => ['active', 'trial'].includes(subscription.status);
  const canExtend = (subscription: Subscription) => ['active', 'trial', 'past_due'].includes(subscription.status);
  const canChangePlan = (subscription: Subscription) => ['active', 'trial'].includes(subscription.status);

  return (
    <>
      <Card className="shadow-sm border-border flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
              <span>Loading subscriptions...</span>
            </div>
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
          /* Table with scroll - same structure as ProductTable */
          <div className="flex-1 overflow-auto">
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
                          {subscription.billingInterval === 'month' ? 'Monthly' : 
                           subscription.billingInterval === 'quarter' ? 'Quarterly' : 
                           subscription.billingInterval === 'year' ? 'Yearly' : 
                           subscription.billingInterval === 'semiAnnual' ? 'Semi-Annual' : 'Custom'}
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
                            {canCancel(subscription) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    handleCancel(subscription);
                                    setOpenMenuId(null);
                                  }}
                                  className="text-action-danger focus:text-action-danger"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
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
        </Card>

      {/* Pagination Section - Same pattern as Merchants component */}
      {pagination && filteredSubscriptions.length > 0 && pagination.total > pagination.limit && (
        <div className="flex-shrink-0 py-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={pagination.onPageChange}
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
