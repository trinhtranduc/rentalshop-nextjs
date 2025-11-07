'use client';

import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Button
} from '@rentalshop/ui/base';
import { 
  Package, 
  Users, 
  CreditCard,
  Star,
  Eye,
  Edit,
  Settings
} from 'lucide-react';
import type { Plan } from '@rentalshop/types';

interface PlanCardProps {
  plan: Plan;
  onView?: (plan: Plan) => void;
  onEdit?: (plan: Plan) => void;
  onToggleStatus?: (plan: Plan) => void;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onView,
  onEdit,
  onToggleStatus,
  showActions = true,
  variant = 'default'
}) => {
  const formatCurrency = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const getBillingCycleText = (cycle: string) => {
    return cycle === 'monthly' ? '/month' : '/year';
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

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-text-tertiary" />
                <span className="font-medium text-text-primary">{plan.name}</span>
                {plan.isPopular && (
                  <Badge variant="default" className="text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-text-primary">
                {formatCurrency(plan.price, plan.currency)}
                <span className="text-sm text-text-secondary font-normal">
                  {getBillingCycleText(plan.billingCycle)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {plan.name}
              {plan.isPopular && (
                <Badge variant="default" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
            </CardTitle>
            <div className="text-right">
              <div className="text-2xl font-bold text-action-primary">
                {formatCurrency(plan.price, plan.currency)}
                <span className="text-sm text-text-secondary font-normal">
                  {getBillingCycleText(plan.billingCycle)}
                </span>
              </div>
              {plan.trialDays > 0 && (
                <div className="text-xs text-action-primary">
                  {plan.trialDays}-day trial
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-secondary">{plan.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Outlets:</span>
              <span className="font-medium">{getLimitText(plan.limits.outlets)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Users:</span>
              <span className="font-medium">{getLimitText(plan.limits.users)}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Products:</span>
              <span className="font-medium">{getLimitText(plan.limits.products)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-secondary">Customers:</span>
              <span className="font-medium">{getLimitText(plan.limits.customers)}</span>
            </div>
          </div>

          <div className="text-sm text-text-secondary">
            <div className="font-medium mb-1">Features ({plan.features.length}):</div>
            <div className="text-xs text-text-tertiary">
              {plan.features.slice(0, 3).join(', ')}
              {plan.features.length > 3 && '...'}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-text-tertiary">
            <span>Created: {formatDate(plan.createdAt)}</span>
            <span>Sort Order: {plan.sortOrder}</span>
          </div>

          {showActions && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(plan)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4" />
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
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {plan.name}
            {plan.isPopular && (
              <Badge variant="default" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Popular
              </Badge>
            )}
          </CardTitle>
          <div className="text-right">
            <div className="text-xl font-bold text-action-primary">
              {formatCurrency(plan.price, plan.currency)}
              <span className="text-sm text-text-secondary font-normal">
                {getBillingCycleText(plan.billingCycle)}
              </span>
            </div>
            {plan.trialDays > 0 && (
              <div className="text-xs text-action-primary">
                {plan.trialDays}-day trial
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-text-secondary line-clamp-2">
          {plan.description}
        </p>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3 text-text-tertiary" />
            <span className="text-text-secondary">Outlets:</span>
            <span className="font-medium">{getLimitText(plan.maxOutlets)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-text-tertiary" />
            <span className="text-text-secondary">Users:</span>
            <span className="font-medium">{getLimitText(plan.maxUsers)}</span>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(plan)}
                className="h-8 w-8 p-0"
              >
                <Eye className="w-4 h-4" />
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
