'use client';

import React, { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Input,
  Badge
} from '../../../ui';
import { Calendar, AlertCircle } from 'lucide-react';
import { getShopTodayKey } from '@rentalshop/utils';
import { orderPresetKeys, rangeForKeys, type OrderPresetId } from './order-date-presets';

export interface DateRangeOption {
  id: string;
  label: string;
  getRange: () => { start: Date; end: Date };
  description?: string;
}

interface OrderDateRangeFilterProps {
  activeRange?: string;
  totalOrders: number;
  filteredCount?: number;
  /** `start`/`end` are the Vietnam day bounds of the chosen days (00:00 … 23:59:59.999 VN), whatever the browser zone. */
  onRangeChange: (rangeId: string, start: Date, end: Date) => void;
  showWarning?: boolean;
}

/**
 * Modern date range filter following Shopify/Stripe patterns
 * Provides dropdown with predefined ranges + custom date picker
 */
export function OrderDateRangeFilter({
  activeRange = 'week',
  totalOrders,
  filteredCount,
  onRangeChange,
  showWarning = false
}: OrderDateRangeFilterProps) {
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ============================================================================
  // DATE RANGE CALCULATIONS - Simplified to 3 main options
  // ============================================================================

  // Vietnam days from the Vietnam today, whatever the browser zone (#578 ADM-4)
  const presetRange = (id: OrderPresetId) => rangeForKeys(orderPresetKeys(id));
  const todayKey = getShopTodayKey();

  // ============================================================================
  // DATE RANGE OPTIONS - Simplified (3 main + others)
  // ============================================================================

  const dateRangeOptions: DateRangeOption[] = [
    {
      id: 'month',
      label: 'Last 30 days',
      getRange: () => presetRange('month'),
      description: 'Default - Most relevant orders'
    },
    {
      id: '90days',
      label: 'Last 90 days',
      getRange: () => presetRange('90days'),
      description: 'Quarterly view'
    },
    {
      id: 'year',
      label: 'Last 12 months',
      getRange: () => presetRange('year'),
      description: 'Annual view'
    },
    {
      id: 'all',
      label: 'All time',
      getRange: () => presetRange('all'),
      description: 'May be slow with large datasets'
    },
    {
      id: 'custom',
      label: 'Custom range...',
      getRange: () => presetRange('today'),
      description: 'Select custom date range'
    }
  ];

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRangeChange = (rangeId: string) => {
    if (rangeId === 'custom') {
      setShowCustomDialog(true);
      return;
    }

    const option = dateRangeOptions.find(opt => opt.id === rangeId);
    if (option) {
      const { start, end } = option.getRange();
      onRangeChange(rangeId, start, end);
    }
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) return;
    
    // The typed keys are the days; `new Date(key)` is UTC midnight and moved the range in non-UTC browsers.
    const { start, end } = rangeForKeys({ from: customStart, to: customEnd });
    
    onRangeChange('custom', start, end);
    setShowCustomDialog(false);
    setCustomStart('');
    setCustomEnd('');
  };

  const currentOption = dateRangeOptions.find(opt => opt.id === activeRange);

  return (
    <>
      {/* Compact Date Range Dropdown - Inline with other filters */}
      <Select value={activeRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Date range">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {currentOption?.label || 'Date range'}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">
            <div className="flex items-center gap-2">
              <span>Last 30 days</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">Default</Badge>
            </div>
          </SelectItem>
          <SelectItem value="90days">Last 90 days</SelectItem>
          <SelectItem value="year">Last 12 months</SelectItem>
          
          {/* Separator */}
          <div className="h-px bg-border my-1"></div>
          
          {/* Others */}
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>All time</span>
              {totalOrders > 10000 && (
                <AlertCircle className="w-3 h-3 text-warning-text" />
              )}
            </div>
          </SelectItem>
          <SelectItem value="custom">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>Custom range...</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      
      {/* Only show warning for large datasets */}
      {showWarning && activeRange === 'all' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-bg border border-warning-border">
          <AlertCircle className="w-4 h-4 text-warning-text flex-shrink-0" />
          <span className="text-sm text-warning-text font-medium">
            Viewing all {totalOrders.toLocaleString()} orders may be slow
          </span>
        </div>
      )}

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Custom Date Range
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={customEnd || todayKey}
              />
            </div>
            
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart}
                max={todayKey}
              />
            </div>

            <div className="text-xs text-text-tertiary bg-bg-secondary p-3 rounded-lg">
              💡 <strong>Tip:</strong> For large date ranges, consider using the export feature instead of viewing all data in the table.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomDialog(false);
                setCustomStart('');
                setCustomEnd('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
            >
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

