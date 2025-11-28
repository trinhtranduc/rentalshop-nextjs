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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Merchants */}
      <Card className="border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalMerchants}</p>
            </div>
            <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
      
      {/* Active Merchants */}
      <Card className="border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Active</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.activeMerchants}</p>
            </div>
            <Building2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
      
      {/* Trial Accounts */}
      <Card className="border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Trial</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.trialAccounts}</p>
            </div>
            <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
      
      {/* Total Revenue */}
      <Card className="border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Revenue</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${(stats.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MerchantListHeader;
