'use client';

import React from 'react';
import { Medal } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
} from '../../../ui';

interface MerchantLoyaltySectionProps {
  isActive: boolean;
  programName?: string | null;
  loading?: boolean;
  saving?: boolean;
  onToggle: (nextActive: boolean) => Promise<void> | void;
}

export function MerchantLoyaltySection({
  isActive,
  programName,
  loading = false,
  saving = false,
  onToggle,
}: MerchantLoyaltySectionProps) {
  const busy = loading || saving;

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Medal className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base">Loyalty Program</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {programName || 'Chương trình khách hàng thân thiết'}
              </p>
            </div>
          </div>
          <Badge
            variant={isActive ? 'secondary' : 'outline'}
            className={
              isActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-gray-50 text-gray-600'
            }
          >
            {loading ? 'Loading...' : saving ? 'Saving...' : isActive ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Enable loyalty for this merchant
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Only Super Admin can turn loyalty on or off. The merchant can still
              configure earn rates and tiers.
            </p>
          </div>
          <Switch
            checked={isActive}
            disabled={busy}
            onCheckedChange={(checked) => {
              void onToggle(checked);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default MerchantLoyaltySection;
