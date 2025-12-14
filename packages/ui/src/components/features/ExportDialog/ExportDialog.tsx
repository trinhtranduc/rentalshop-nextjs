'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Download, Calendar } from 'lucide-react';

export type DateRangePeriod = '1month' | '3months' | '6months' | '1year' | 'custom';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (params: {
    period: DateRangePeriod;
    startDate?: string;
    endDate?: string;
    format?: 'excel' | 'csv';
  }) => void;
  resourceName: string;
  isLoading?: boolean;
  selectedCount?: number; // Number of selected items
  fileName?: string; // Custom file name
}

const DATE_RANGE_OPTIONS: { value: DateRangePeriod; label: string }[] = [
  { value: '1month', label: 'Last 30 Days' },
  { value: '3months', label: 'Last 90 Days' },
  { value: '6months', label: 'Last 180 Days' },
  { value: '1year', label: 'Last 365 Days' },
  { value: 'custom', label: 'Custom Range' }
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  resourceName,
  isLoading = false,
  selectedCount = 0,
  fileName
}) => {
  const [period, setPeriod] = useState<DateRangePeriod>('1month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [format, setFormat] = useState<'excel' | 'csv'>('excel');
  
  // If items are selected, don't show date range selector
  const hasSelection = selectedCount > 0;
  
  // Generate file name based on format - updates when format changes
  const generatedFileName = React.useMemo(() => {
    if (!hasSelection) return undefined;
    const dateStr = new Date().toISOString().split('T')[0];
    const extension = format === 'csv' ? 'csv' : 'xlsx';
    return `${resourceName.toLowerCase()}-export-${dateStr}.${extension}`;
  }, [hasSelection, resourceName, format]);

  const handleExport = () => {
    // If has selection, export without date range
    if (hasSelection) {
      onExport({ period: '1month', format }); // Default period, but won't be used
      return;
    }
    
    if (period === 'custom') {
      if (!startDate || !endDate) {
        return;
      }
      onExport({ period, startDate, endDate, format });
    } else {
      onExport({ period, format });
    }
  };

  const handlePeriodChange = (value: DateRangePeriod) => {
    setPeriod(value);
    if (value !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Calculate default dates for custom range (last 30 days)
  React.useEffect(() => {
    if (period === 'custom' && !startDate && !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      
      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
    }
  }, [period, startDate, endDate]);

  const isCustomPeriod = period === 'custom';
  // If has selection, can always export. Otherwise, need valid date range
  const canExport = hasSelection || (!isCustomPeriod || (startDate && endDate));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export {resourceName}</DialogTitle>
          <DialogDescription>
            {hasSelection 
              ? `Export ${selectedCount} selected ${resourceName.toLowerCase()}.`
              : 'Choose a date range to export. Maximum 1 year of data can be exported at once.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selection Info - Simple display when items are selected */}
          {hasSelection ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Selected Records:
                  </span>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {selectedCount} {resourceName.toLowerCase()}
                  </span>
                </div>
                {generatedFileName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      File Name:
                    </span>
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-mono">
                      {generatedFileName}
                    </span>
                  </div>
                )}
              </div>

              {/* Format Selection - Only format when has selection */}
              <div className="space-y-2">
                <Label htmlFor="format">Export Format</Label>
                <Select value={format} onValueChange={(value: 'excel' | 'csv') => setFormat(value)}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <>
              {/* Format Selection */}
              <div className="space-y-2">
                <Label htmlFor="format">Export Format</Label>
                <Select value={format} onValueChange={(value: 'excel' | 'csv') => setFormat(value)}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period Selection */}
              <div className="space-y-2">
                <Label htmlFor="period">Date Range</Label>
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger id="period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {isCustomPeriod && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  {startDate && endDate && (
                    <p className="text-sm text-gray-500">
                      {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days selected
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport || isLoading}
            variant="default"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

ExportDialog.displayName = 'ExportDialog';

