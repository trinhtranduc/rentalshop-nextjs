'use client'

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Pagination
} from '../../../ui';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CreditCard,
  Calendar,
  DollarSign,
  Users,
  Building,
  Package,
  Clock,
  X
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
  onChangePlan,
  loading = false,
  pagination
}: SubscriptionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [merchantFilter, setMerchantFilter] = useState<string>('all');
  const [filteredSubscriptions, setFilteredSubscriptions] = useState(subscriptions);
  
  // Dialog states
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  

  // Filter subscriptions
  useEffect(() => {
    let filtered = subscriptions;

    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.merchant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.plan?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.id.toString().includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(sub => sub.planId.toString() === planFilter);
    }

    if (merchantFilter !== 'all') {
      filtered = filtered.filter(sub => sub.merchantId.toString() === merchantFilter);
    }

    setFilteredSubscriptions(filtered);
  }, [subscriptions, searchTerm, statusFilter, planFilter, merchantFilter]);

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
  };

  const handleEditSave = async (data: any) => {
    if (onEdit) {
      await onEdit(data);
    }
    setShowEditDialog(false);
  };

  const handleCancel = (subscription: Subscription) => {
    onCancel?.(subscription, ''); // Reason will be collected in the confirmation dialog
  };

  const handleExtend = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowExtendDialog(true);
  };

  const handleChangePlan = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowChangePlanDialog(true);
  };



  const handleExtendConfirm = (subscription: Subscription, data: any) => {
    onExtend?.(subscription);
    setShowExtendDialog(false);
    setSelectedSubscription(null);
  };

  const handleChangePlanConfirm = (subscription: Subscription, newPlanId: number, period: BillingPeriod) => {
    onChangePlan?.(subscription, newPlanId, period);
    setShowChangePlanDialog(false);
    setSelectedSubscription(null);
  };

  const canCancel = (subscription: Subscription) => ['active', 'trial'].includes(subscription.status);
  const canExtend = (subscription: Subscription) => ['active', 'trial', 'past_due'].includes(subscription.status);
  const canChangePlan = (subscription: Subscription) => ['active', 'trial'].includes(subscription.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
          <p className="text-gray-600">Manage merchant subscriptions and billing</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {plans && plans.length > 0 ? plans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    {plan.name}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>

            <Select value={merchantFilter} onValueChange={setMerchantFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by merchant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Merchants</SelectItem>
                {merchants && merchants.length > 0 ? merchants.map(merchant => (
                  <SelectItem key={merchant.id} value={merchant.id.toString()}>
                    {merchant.name}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading subscriptions...</span>
              </div>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No subscriptions found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            /* Card-style rows */
            <div className="space-y-4">
              {filteredSubscriptions.map((subscription) => (
                <Card 
                  key={subscription.id} 
                  className="hover:shadow-md transition-shadow duration-200 border-border cursor-pointer"
                  onClick={() => handleView(subscription)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Left side - Main info */}
                      <div className="flex items-center gap-4 flex-1">
                        {/* Subscription Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-action-primary to-brand-primary rounded-lg flex items-center justify-center">
                          <Building className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Subscription Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-text-primary">
                              {subscription.merchant?.name || 'Unknown Merchant'}
                            </h3>
                            {getStatusBadge(subscription.status)}
                            {isExpiringSoon(subscription.currentPeriodEnd) && (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">
                                Expiring Soon
                              </Badge>
                            )}
                            {isExpired(subscription.currentPeriodEnd) && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-text-secondary">
                            <div className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              <span>{subscription.plan?.name || 'Unknown Plan'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Started {formatDate(subscription.currentPeriodStart)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Next billing {formatDate(subscription.currentPeriodEnd)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {subscription.period === 1 ? 'Monthly' : 
                                 subscription.period === 3 ? 'Quarterly' : 
                                 subscription.period === 12 ? 'Yearly' : 'Custom'} billing
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side - Amount and Actions */}
                      <div className="flex items-center gap-4">
                        {/* Amount */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-text-primary">
                            {formatCurrency(subscription.amount, subscription.currency)}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {subscription.discount > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 font-medium">
                                  {subscription.discount}% off
                                </span>
                                <span className="text-xs">
                                  Save {formatCurrency(subscription.savings, subscription.currency)}
                                </span>
                              </div>
                            ) : (
                              <span>Standard pricing</span>
                            )}
                          </div>
                          <div className="text-xs text-text-tertiary">
                            {subscription.period === 1 ? 'per month' : 
                             subscription.period === 3 ? 'per quarter' : 
                             subscription.period === 12 ? 'per year' : 'per period'}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {/* Primary Actions - Always Visible */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleView(subscription); }}
                            className="h-8 px-3"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onEdit?.(subscription); }}
                            className="h-8 px-3"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} subscriptions
          </div>
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
    </div>
  );
}
