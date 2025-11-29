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
  isLoading = false
}) => {
  const [period, setPeriod] = useState<DateRangePeriod>('1month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [format, setFormat] = useState<'excel' | 'csv'>('excel');

  const handleExport = () => {
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
  const canExport = !isCustomPeriod || (startDate && endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export {resourceName}</DialogTitle>
          <DialogDescription>
            Choose a date range to export. Maximum 1 year of data can be exported at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

