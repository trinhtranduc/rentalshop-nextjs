'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Pause,
  XCircle,
  MinusCircle
} from 'lucide-react';
import { formatSubscriptionPeriod, getSubscriptionStatusBadge, type SubscriptionPeriod } from '@rentalshop/utils';

interface SubscriptionPeriodCardProps {
  period: SubscriptionPeriod;
  planName?: string;
  amount?: number;
  currency?: string;
  className?: string;
}

export function SubscriptionPeriodCard({
  period,
  planName,
  amount,
  currency = 'USD',
  className = ''
}: SubscriptionPeriodCardProps) {
  const formatted = formatSubscriptionPeriod(period);
  const statusBadge = getSubscriptionStatusBadge(period.isActive ? 'active' : 'inactive', period.daysRemaining);
  
  const getStatusIcon = () => {
    switch (statusBadge.icon) {
      case 'clock': return <Clock className="w-4 h-4" />;
      case 'alert-triangle': return <AlertTriangle className="w-4 h-4" />;
      case 'check-circle': return <CheckCircle className="w-4 h-4" />;
      case 'pause': return <Pause className="w-4 h-4" />;
      case 'x-circle': return <XCircle className="w-4 h-4" />;
      default: return <MinusCircle className="w-4 h-4" />;
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Subscription Period
          </CardTitle>
          <Badge className={`${statusBadge.color} flex items-center gap-1`}>
            {getStatusIcon()}
            {statusBadge.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Plan Information */}
        {planName && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Plan</span>
            <span className="text-sm font-semibold">{planName}</span>
          </div>
        )}
        
        {/* Amount */}
        {amount !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Amount</span>
            <span className="text-sm font-semibold">
              {currency} {amount.toFixed(2)}
            </span>
          </div>
        )}
        
        {/* Period Dates */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {formatted.period}
            </div>
            <div className="text-xs text-gray-500">
              {period.duration} billing cycle
            </div>
          </div>
        </div>
        
        {/* Time Remaining */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {formatted.timeRemaining}
            </div>
            <div className="text-xs text-gray-500">
              Next billing: {formatted.nextBilling}
            </div>
          </div>
        </div>
        
        {/* Trial Information */}
        {period.isTrial && period.endDate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-900">
                  Trial Period
                </div>
                <div className="text-xs text-blue-700">
                  Trial ends: {formatted.trialEnd}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
