'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@rentalshop/ui';
import { Button } from '@rentalshop/ui';
import { Badge } from '@rentalshop/ui';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import type { CustomerWithMerchant } from '@rentalshop/types';
import type { Customer } from '@rentalshop/types';
import { useCustomerTranslations } from '@rentalshop/hooks';
import { useFormattedFullDate } from '@rentalshop/utils/client';

// Union type to handle both local and database customer types
type CustomerData = Customer | CustomerWithMerchant;

interface CustomerInfoCardProps {
  customer?: CustomerData | null;
  onEdit?: () => void;
  onViewOrders?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  isLoading?: boolean;
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({ 
  customer,
  onEdit,
  onViewOrders,
  onDelete,
  showActions = true,
  isLoading = false
}) => {
  const t = useCustomerTranslations();
  
  // Use centralized date formatting hook (DRY principle)
  const formatDate = useFormattedFullDate;

  const formatAddress = () => {
    if (!customer) return t('fields.noAddress');
    
    const parts = [
      customer.address,
      customer.city,
      customer.state,
      customer.zipCode,
      customer.country
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : t('fields.noAddress');
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t('customerInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if no customer data
  if (!customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t('customerInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">{t('noDataAvailable')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t('customerInformation')}
          </CardTitle>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="flex items-center space-x-2">
              {onEdit && (
                <Button
                  onClick={onEdit}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>{t('actions.edit')}</span>
                </Button>
              )}
              
              {onViewOrders && (
                <Button
                  onClick={onViewOrders}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t('actions.orders')}</span>
                </Button>
              )}
              
              {onDelete && (
                <Button
                  onClick={onDelete}
                  variant="destructive"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('actions.delete')}</span>
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="border-b border-gray-200 mt-4"></div>
      </CardHeader>
      
      <CardContent>
        {customer.loyaltyStatus === 'active' && customer.loyalty ? (
          <div className="mb-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Loyalty</p>
                <p className="text-sm text-gray-600">
                  {customer.loyalty.tier?.name
                    ? `Hạng hiện tại: ${customer.loyalty.tier.name}`
                    : 'Chưa có hạng loyalty'}
                </p>
              </div>
              {customer.loyalty.tier?.name && (
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  {customer.loyalty.tier.name}
                </Badge>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-normal text-gray-500 mb-1">Điểm</label>
                <p className="text-gray-900 text-base font-medium">{customer.loyalty.points.toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-500 mb-1">Đã tích lũy</label>
                <p className="text-gray-900 text-base font-medium">{customer.loyalty.totalEarned.toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-500 mb-1">Đã đổi</label>
                <p className="text-gray-900 text-base font-medium">{customer.loyalty.totalRedeemed.toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-500 mb-1">Đã chi tiêu</label>
                <p className="text-gray-900 text-base font-medium">{new Intl.NumberFormat('vi-VN').format(customer.loyalty.totalSpent)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Loyalty</p>
                <p className="text-sm text-gray-600">
                  {customer.loyaltyStatus === 'unavailable'
                    ? 'Loyalty không khả dụng cho plan hiện tại.'
                    : 'Loyalty chưa kích hoạt.'}
                </p>
              </div>
              <Badge variant="outline" className="border-gray-200 text-gray-600">
                {customer.loyaltyStatus === 'unavailable' ? 'Khóa' : 'Tắt'}
              </Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-normal text-gray-500 mb-2">{t('fields.fullName')}</label>
                <p className="text-gray-900 text-base font-medium">
                  {[customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'N/A'}
                </p>
              </div>

              {customer.email && customer.email.trim() !== '' && (
                <div>
                  <label className="block text-sm font-normal text-gray-500 mb-2">{t('fields.email')}</label>
                  <p className="text-gray-900 text-base">{customer.email}</p>
                </div>
              )}

              {customer.phone && customer.phone.trim() !== '' && (
                <div>
                  <label className="block text-sm font-normal text-gray-500 mb-2">{t('fields.phone')}</label>
                  <p className="text-gray-900 text-base">{customer.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Address and Account Information */}
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-normal text-gray-500 mb-2">{t('fields.address')}</label>
                <p className="text-gray-900 text-base">{formatAddress()}</p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-500 mb-2">{t('stats.memberSince')}</label>
                <p className="text-gray-900 text-base">{formatDate(customer.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
