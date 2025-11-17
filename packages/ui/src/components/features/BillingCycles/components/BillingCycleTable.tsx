"use client"

import React from 'react';
import { 
  Card, 
  CardContent,
  Badge,
  Button,
  StatusBadge
} from '@rentalshop/ui';
import { 
  Calendar,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Eye
} from 'lucide-react';
import { useCommonTranslations } from '@rentalshop/hooks';

// Local type definitions
interface BillingCycle {
  id: number;
  name: string;
  value: string;
  months: number;
  discount: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface BillingCycleTableProps {
  billingCycles: BillingCycle[];
  onView?: (billingCycle: BillingCycle) => void;
  onEdit?: (billingCycle: BillingCycle) => void;
  onToggleStatus?: (billingCycle: BillingCycle) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  loading?: boolean;
}

export const BillingCycleTable: React.FC<BillingCycleTableProps> = ({
  billingCycles,
  onView,
  onEdit,
  onToggleStatus,
  sortBy = 'sortOrder',
  sortOrder = 'asc',
  onSort,
  loading = false
}) => {
  const t = useCommonTranslations();
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
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
    <Card className="shadow-sm border-border flex flex-col h-full">
      <CardContent className="p-0 flex-1 overflow-hidden">
        {/* Table with scroll - flex layout */}
        <div className="flex-1 overflow-auto h-full">
          <table className="w-full">
            <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10">
              <tr>
                <th 
                  className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center gap-2">
                    Value
                    {getSortIcon('value')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                  onClick={() => handleSort('months')}
                >
                  <div className="flex items-center gap-2">
                    Months
                    {getSortIcon('months')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-text-primary cursor-pointer hover:bg-bg-secondary"
                  onClick={() => handleSort('discount')}
                >
                  <div className="flex items-center gap-2">
                    Discount
                    {getSortIcon('discount')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Description</th>
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
              {billingCycles.map((cycle) => (
                <tr key={cycle.id} className="border-b border-border hover:bg-bg-secondary">
                  <td className="py-4 px-4">
                    <div className="font-medium text-text-primary">{cycle.name}</div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="outline" className="font-mono">
                      {cycle.value}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-tertiary" />
                      <span className="font-medium">{cycle.months}</span>
                      <span className="text-sm text-text-secondary">
                        {cycle.months === 1 ? 'month' : 'months'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {cycle.discount > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          {cycle.discount}%
                        </Badge>
                      ) : (
                        <span className="text-text-tertiary">No discount</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-text-secondary max-w-xs truncate">
                      {cycle.description || 'No description'}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge 
                        status={cycle.isActive ? 'active' : 'inactive'}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-text-secondary">
                    {formatDate(cycle.createdAt)}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(cycle)}
                          className="h-8 w-8 p-0"
                          title="View billing cycle"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(cycle)}
                          className="h-8 w-8 p-0"
                          title="Edit billing cycle"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Delete button removed - will be moved to detail page */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {billingCycles.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">{t('messages.noBillingCycles')}</h3>
              <p className="text-text-secondary">
                {t('messages.getStartedBillingCycle')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
