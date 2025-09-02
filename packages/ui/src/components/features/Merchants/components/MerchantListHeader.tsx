import React from 'react';
import { Card, CardContent } from '../../../ui';
import { Users, Building2, CreditCard, TrendingUp } from 'lucide-react';

interface MerchantListStats {
  totalMerchants: number;
  activeMerchants: number;
  trialAccounts: number;
  totalRevenue: number;
}

interface MerchantListHeaderProps {
  stats: MerchantListStats;
}

export function MerchantListHeader({ stats }: MerchantListHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Merchants */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Merchants</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMerchants}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">All registered merchants</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Merchants */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Merchants</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeMerchants}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Currently active accounts</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Trial Accounts */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Trial Accounts</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.trialAccounts}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Free trial users</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Total Revenue */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${(stats.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lifetime earnings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MerchantListHeader;
