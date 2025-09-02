'use client';

import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Button,
  StatusBadge
} from '@rentalshop/ui';
import { 
  Package, 
  Users, 
  CreditCard,
  Star,
  Eye,
  Edit,
  Settings,
  ChevronUp,
  ChevronDown,
  Trash2
} from 'lucide-react';
import type { Plan } from '@rentalshop/types';

interface PlanTableProps {
  plans: Plan[];
  onView?: (plan: Plan) => void;
  onEdit?: (plan: Plan) => void;
  onDelete?: (plan: Plan) => void;
  onToggleStatus?: (plan: Plan) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  loading?: boolean;
}

export const PlanTable: React.FC<PlanTableProps> = ({
  plans,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  sortBy = 'sortOrder',
  sortOrder = 'asc',
  onSort,
  loading = false
}) => {
  const formatCurrency = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const getBillingCycleText = (cycle: string) => {
    const cycleMap: Record<string, string> = {
      'monthly': '/month',
      'quarterly': '/quarter (3 months)',
      'semi_annual': '/6 months',
      'annual': '/year (12 months)'
    };
    return cycleMap[cycle] || '/month';
  };

  const getBillingCycleDiscount = (cycle: string) => {
    const discountMap: Record<string, number> = {
      'monthly': 0,
      'quarterly': 5,
      'semi_annual': 10,
      'annual': 20
    };
    return discountMap[cycle] || 0;
  };

  const calculateDiscountedPrice = (price: number, cycle: string) => {
    const discount = getBillingCycleDiscount(cycle);
    const monthsMap: Record<string, number> = {
      'monthly': 1,
      'quarterly': 3,
      'semi_annual': 6,
      'annual': 12
    };
    const months = monthsMap[cycle] || 1;
    const totalPrice = price * months;
    const discountAmount = totalPrice * (discount / 100);
    return totalPrice - discountAmount;
  };

  const getLimitText = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field);
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-bg-tertiary rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th 
                  className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Plan Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Price
                    {getSortIcon('price')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Limits</th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Features</th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Status</th>
                <th 
                  className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Created
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-medium text-text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-border hover:bg-bg-secondary">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-text-primary flex items-center gap-2">
                        {plan.name}
                        {plan.isPopular && (
                          <Badge variant="default" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-text-secondary mt-1 max-w-xs truncate">
                        {plan.description}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-text-primary">
                        {formatCurrency(plan.price, plan.currency)}
                        <span className="text-sm text-text-secondary font-normal">
                          {getBillingCycleText(plan.billingCycle)}
                        </span>
                      </div>
                      
                      {/* Show discount if applicable */}
                      {getBillingCycleDiscount(plan.billingCycle) > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          {getBillingCycleDiscount(plan.billingCycle)}% discount
                        </div>
                      )}
                      
                      {/* Show total price for longer cycles */}
                      {plan.billingCycleMonths > 1 && (
                        <div className="text-xs text-text-tertiary mt-1">
                          Total: {formatCurrency(calculateDiscountedPrice(plan.price, plan.billingCycle), plan.currency)}
                        </div>
                      )}
                      
                      {plan.trialDays > 0 && (
                        <div className="text-xs text-action-primary mt-1">
                          {plan.trialDays}-day trial
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-3 h-3 text-text-tertiary" />
                        <span className="text-text-secondary">Outlets:</span>
                        <span className="font-medium">{getLimitText(plan.maxOutlets)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-text-tertiary" />
                        <span className="text-text-secondary">Users:</span>
                        <span className="font-medium">{getLimitText(plan.maxUsers)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-text-tertiary" />
                        <span className="text-text-secondary">Products:</span>
                        <span className="font-medium">{getLimitText(plan.maxProducts)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-text-tertiary" />
                        <span className="text-text-secondary">Customers:</span>
                        <span className="font-medium">{getLimitText(plan.maxCustomers)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-text-secondary">
                      {plan.features.length} features
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      {plan.features.slice(0, 2).join(', ')}
                      {plan.features.length > 2 && '...'}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <StatusBadge 
                      status={plan.isActive ? 'active' : 'inactive'}
                    />
                  </td>
                  <td className="py-4 px-4 text-sm text-text-secondary">
                    {formatDate(plan.createdAt)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(plan)}
                          className="h-8 px-3 text-sm"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Options
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(plan)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onToggleStatus && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleStatus(plan)}
                          className="h-8 w-8 p-0"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(plan)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {plans.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No plans found</h3>
              <p className="text-text-secondary">
                Get started by creating your first subscription plan
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
