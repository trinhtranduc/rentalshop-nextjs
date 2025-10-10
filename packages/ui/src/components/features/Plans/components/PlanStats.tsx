'use client';

import React from 'react';
import { 
  Card, 
  CardContent
} from '@rentalshop/ui';
import { 
  Package,
  Star,
  TrendingUp,
  Users
} from 'lucide-react';

interface PlanStatsProps {
  totalPlans: number;
  activePlans: number;
  featuredPlans: number;
  plansWithTrial: number;
  className?: string;
}

export const PlanStats: React.FC<PlanStatsProps> = ({
  totalPlans,
  activePlans,
  featuredPlans,
  plansWithTrial,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-action-primary">
              {totalPlans}
            </div>
            <div className="text-sm text-text-secondary">Total Plans</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-action-success">
              {activePlans}
            </div>
            <div className="text-sm text-text-secondary">Active Plans</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-secondary">
              {featuredPlans}
            </div>
            <div className="text-sm text-text-secondary">Featured Plans</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-action-primary">
              {plansWithTrial}
            </div>
            <div className="text-sm text-text-secondary">Plans with Trial</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
