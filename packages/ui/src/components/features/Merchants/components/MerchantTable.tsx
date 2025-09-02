import React from 'react';
import { 
  Card, 
  CardContent,
  Button,
  StatusBadge
} from '../../../ui';
import { 
  Eye, 
  Edit
} from 'lucide-react';

interface Merchant {
  id: number;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  trialEndsAt?: string;
  expiredAt?: string;
  outletsCount: number;
  usersCount: number;
  productsCount: number;
  totalRevenue: number;
  createdAt: string;
  lastActiveAt: string;
}

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
  const getStatusBadge = (merchant: Merchant) => {
    if (!merchant.isActive) {
      return <StatusBadge status="inactive" size="sm" />;
    }
    
    return <StatusBadge status={merchant.subscriptionStatus} size="sm" />;
  };

  if (merchants.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
              <CardContent className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
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
    <div className="space-y-6">
      {/* Header with sorting options */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Merchants ({merchants.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Sort by:</span>
          <div className="flex items-center gap-1">
            {[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'subscriptionPlan', label: 'Plan' },
              { key: 'createdAt', label: 'Created' },
              { key: 'trialEndsAt', label: 'Trial Expires' },
              { key: 'expiredAt', label: 'Expired At' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onSort?.(key)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  sortBy === key
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {label}
                {sortBy === key && (
                  <span className="ml-1">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card-style rows */}
      <div className="grid gap-4">
        {merchants.map((merchant) => (
          <Card 
            key={merchant.id} 
            className="hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Left side - Main info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Merchant Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {merchant.name}
                      </h3>
                      {getStatusBadge(merchant)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                      {/* Contact Info */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Contact</p>
                        <p className="text-gray-900 dark:text-white">{merchant.email}</p>
                        <p className="text-gray-500 dark:text-gray-400">{merchant.phone}</p>
                      </div>
                      
                      {/* Subscription Plan */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Plan</p>
                        <p className="text-gray-900 dark:text-white font-medium">{merchant.subscriptionPlan}</p>
                        <p className="text-gray-500 dark:text-gray-400 capitalize">{merchant.subscriptionStatus}</p>
                      </div>
                      
                      {/* Created Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                        <p className="text-gray-900 dark:text-white">
                          {merchant.createdAt ? new Date(merchant.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                      
                      {/* Trial Expires Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Trial Expires</p>
                        <p className="text-gray-900 dark:text-white">
                          {merchant.trialEndsAt ? new Date(merchant.trialEndsAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                      
                      {/* Expired At Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Expired At</p>
                        <p className="text-gray-900 dark:text-white">
                          {merchant.expiredAt ? new Date(merchant.expiredAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMerchantAction('view', merchant.id)}
                    className="h-9 px-4"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMerchantAction('edit', merchant.id)}
                    className="h-9 px-4"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MerchantTable;
