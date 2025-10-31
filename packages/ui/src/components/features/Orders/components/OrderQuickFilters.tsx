import React from 'react';
import { Button, Badge } from '../../../ui';
import { Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react';

export interface QuickFilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  startDate: Date;
  endDate: Date;
  description?: string;
}

interface OrderQuickFiltersProps {
  activeFilter?: string;
  totalOrders: number;
  filteredCount?: number;
  onFilterChange: (filter: QuickFilterOption | null) => void;
  showWarning?: boolean;
}

/**
 * Quick filter buttons for common time ranges
 * Following Shopify, Stripe pattern - encourage time-based filtering
 */
export function OrderQuickFilters({
  activeFilter,
  totalOrders,
  filteredCount,
  onFilterChange,
  showWarning = false
}: OrderQuickFiltersProps) {
  const now = new Date();
  
  // Calculate date ranges
  const getDateRange = (days: number): { start: Date; end: Date } => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    
    return { start, end };
  };
  
  const getTodayRange = (): { start: Date; end: Date } => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  
  const getThisWeekRange = (): { start: Date; end: Date } => {
    const start = new Date();
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  
  const getThisMonthRange = (): { start: Date; end: Date } => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  
  const getThisQuarterRange = (): { start: Date; end: Date } => {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  
  // Quick filter options
  const todayRange = getTodayRange();
  const weekRange = getThisWeekRange();
  const monthRange = getDateRange(30);
  const quarterRange = getThisQuarterRange();
  
  const quickFilters: QuickFilterOption[] = [
    {
      id: 'today',
      label: 'Today',
      icon: <Clock className="w-3.5 h-3.5" />,
      startDate: todayRange.start,
      endDate: todayRange.end,
      description: 'Orders created today'
    },
    {
      id: 'week',
      label: 'This Week',
      icon: <Calendar className="w-3.5 h-3.5" />,
      startDate: weekRange.start,
      endDate: weekRange.end,
      description: 'Orders from this week'
    },
    {
      id: 'month',
      label: 'Last 30 Days',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      startDate: monthRange.start,
      endDate: monthRange.end,
      description: 'Most commonly used filter'
    },
    {
      id: 'quarter',
      label: 'This Quarter',
      icon: <Calendar className="w-3.5 h-3.5" />,
      startDate: quarterRange.start,
      endDate: quarterRange.end,
      description: 'Orders from current quarter'
    }
  ];

  return (
    <div className="space-y-3">
      {/* Quick Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-text-secondary">Quick filters:</span>
        
        {quickFilters.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(filter)}
            className="gap-1.5"
          >
            {filter.icon}
            {filter.label}
          </Button>
        ))}
        
        {activeFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(null)}
            className="text-text-tertiary hover:text-text-primary"
          >
            Clear
          </Button>
        )}
      </div>
      
      {/* Info Banner */}
      {filteredCount !== undefined && totalOrders > 0 && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${
          showWarning 
            ? 'bg-warning-bg border border-warning-border' 
            : 'bg-bg-secondary border border-border'
        }`}>
          {showWarning && <AlertCircle className="w-4 h-4 text-warning-text flex-shrink-0" />}
          
          <div className="flex-1 flex items-center gap-2 text-sm">
            {activeFilter ? (
              <>
                <span className="text-text-secondary">Showing</span>
                <Badge variant="outline" className="font-semibold">
                  {filteredCount.toLocaleString()}
                </Badge>
                <span className="text-text-secondary">of</span>
                <Badge variant="outline">
                  {totalOrders.toLocaleString()}
                </Badge>
                <span className="text-text-secondary">total orders</span>
              </>
            ) : (
              <>
                {showWarning ? (
                  <>
                    <span className="text-warning-text font-medium">
                      ⚠️ Viewing all {totalOrders.toLocaleString()} orders
                    </span>
                    <span className="text-text-tertiary">
                      - Use quick filters for better performance
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-text-secondary">Total orders:</span>
                    <Badge variant="outline" className="font-semibold">
                      {totalOrders.toLocaleString()}
                    </Badge>
                  </>
                )}
              </>
            )}
          </div>
          
          {activeFilter && (
            <span className="text-xs text-text-tertiary">
              {quickFilters.find(f => f.id === activeFilter)?.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

