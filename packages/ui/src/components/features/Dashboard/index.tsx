import React from 'react';
import { 
  DashboardHeader,
  DashboardStats,
  DashboardCharts,
  DashboardActions,
  DashboardFocus,
  DashboardNavigation
} from './components';
import DashboardWrapper from '../../layout/DashboardWrapper';
import { DashboardData } from './types';

interface DashboardProps {
  data: DashboardData;
  onPeriodChange: (period: string) => void;
  onActionClick: (action: string) => void;
}

export function Dashboard({ data, onPeriodChange, onActionClick }: DashboardProps) {
  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <DashboardHeader 
          period={data.period}
          onPeriodChange={onPeriodChange}
        />
        
        <DashboardStats stats={data.stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardCharts 
            orderData={data.orderData}
            incomeData={data.incomeData}
          />
          <DashboardFocus focus={data.todaysFocus} />
        </div>
        
        <DashboardActions onActionClick={onActionClick} />
        <DashboardNavigation activeTab={data.activeTab} />
      </div>
    </DashboardWrapper>
  );
}

export default Dashboard;
