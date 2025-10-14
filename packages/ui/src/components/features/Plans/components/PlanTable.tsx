'use client';

import React, { useState } from 'react';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  StatusBadge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
  Trash2,
  MoreVertical
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const formatCurrency = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  const getLimitText = (limit: number | undefined) => {
    if (limit === undefined || limit === null) return 'N/A';
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

  if (plans.length === 0) {
    return (
      <Card className="shadow-sm border-border">
        <CardContent className="text-center py-12">
          <div className="text-text-tertiary">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">No plans found</h3>
            <p className="text-sm">
              Get started by creating your first subscription plan.
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
            {/* Table Header - Sticky */}
            <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Plan Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Price & Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="bg-bg-card divide-y divide-border">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-bg-secondary transition-colors">
                  {/* Plan Name with Icon */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-action-primary to-brand-primary flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-text-primary">
                            {plan.name}
                          </div>
                          {plan.isPopular && (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              <Star className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-text-tertiary mt-1">
                          {plan.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Price */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {formatCurrency(plan.basePrice, plan.currency)}
                        <span className="text-sm text-text-secondary font-normal">/month</span>
                      </div>
                      {plan.trialDays > 0 && (
                        <div className="text-xs text-action-primary mt-1">
                          {plan.trialDays}-day trial
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Limits - Compact */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {getLimitText(plan.limits.outlets)} outlets
                    </div>
                    <div className="text-sm text-text-secondary">
                      {getLimitText(plan.limits.users)} users
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge 
                      status={plan.isActive ? 'active' : 'inactive'}
                    />
                  </td>
                  
                  {/* Created Date */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-primary">
                      {formatDate(plan.createdAt)}
                    </div>
                  </td>
                  {/* Actions - Dropdown Menu */}
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        open={openMenuId === plan.id}
                        onOpenChange={(open: boolean) => setOpenMenuId(open ? plan.id : null)}
                      >
                        {onView && (
                          <DropdownMenuItem 
                            onClick={() => {
                              onView(plan);
                              setOpenMenuId(null);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem 
                            onClick={() => {
                              onEdit(plan);
                              setOpenMenuId(null);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Plan
                          </DropdownMenuItem>
                        )}
                        {onToggleStatus && (
                          <DropdownMenuItem 
                            onClick={() => {
                              onToggleStatus(plan);
                              setOpenMenuId(null);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            {plan.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                onDelete(plan);
                                setOpenMenuId(null);
                              }}
                              className="text-action-danger focus:text-action-danger"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Plan
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
};
