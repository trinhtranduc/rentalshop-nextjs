'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Calendar } from 'lucide-react';
import { Button } from '@rentalshop/ui';
import { useSubscriptionStatusInfo } from '@rentalshop/hooks';
import { useRouter } from 'next/navigation';

const DISMISS_STORAGE_KEY = 'subscription_expiry_banner_dismissed';

export default function SubscriptionExpiryBanner() {
  const router = useRouter();
  const { daysUntilExpiry, isExpiringSoon, planName, loading } = useSubscriptionStatusInfo();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const now = new Date();
        // Reset dismissal after 24 hours
        if (now.getTime() - dismissedDate.getTime() > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(DISMISS_STORAGE_KEY);
        } else {
          setIsDismissed(true);
        }
      }
    }
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_STORAGE_KEY, new Date().toISOString());
      setIsDismissed(true);
    }
  };

  const handleExtend = () => {
    router.push('/subscriptions');
  };

  // Only show if:
  // 1. Not loading
  // 2. Not dismissed
  // 3. Days remaining <= 7 and > 0
  // 4. Is expiring soon
  if (
    loading ||
    isDismissed ||
    !daysUntilExpiry ||
    daysUntilExpiry > 7 ||
    daysUntilExpiry <= 0 ||
    !isExpiringSoon
  ) {
    return null;
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-orange-800">
              <strong>Gói dịch vụ của bạn sẽ hết hạn trong {daysUntilExpiry} ngày còn lại.</strong>{' '}
              Hãy xem xét gia hạn để tránh gián đoạn dịch vụ.
            </p>
            {planName && (
              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Plan: {planName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleExtend}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Gia hạn ngay
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

