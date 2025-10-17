import React from 'react';
import { Card, CardContent } from '../../../ui';
import { Users, Building2, CreditCard, TrendingUp } from 'lucide-react';
import type { Merchant, MerchantDetailStats } from '@rentalshop/types';

interface MerchantHeaderProps {
  merchant: Merchant;
  stats: MerchantDetailStats;
}

export function MerchantHeader({ merchant, stats }: MerchantHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Merchant Info */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Merchant</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{merchant.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{merchant.email}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Total Outlets */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="text-center">
            <Building2 className="w-6 h-6 text-blue-700 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Outlets</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOutlets}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Business locations</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Total Users */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="text-center">
            <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Staff accounts</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Total Revenue */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(stats.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lifetime earnings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MerchantHeader;
