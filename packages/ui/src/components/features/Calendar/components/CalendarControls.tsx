import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

type LayoutMode = 'side-by-side' | 'stacked' | 'full-width' | 'overlay' | 'slide-out' | 'accordion' | 'resizable' | 'tabbed' | 'dashboard' | 'minimal';

interface CalendarControlsProps {
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
}

export function CalendarControls({
  layoutMode,
  onLayoutModeChange
}: CalendarControlsProps) {
  const layoutOptions = [
    { value: 'overlay', label: 'Overlay' },
    { value: 'slide-out', label: 'Slide-out' },
    { value: 'accordion', label: 'Accordion' },
    { value: 'resizable', label: 'Resizable' },
    { value: 'tabbed', label: 'Tabbed' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'side-by-side', label: 'Side by Side' },
    { value: 'stacked', label: 'Stacked' },
    { value: 'full-width', label: 'Full Width' }
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Layout:</label>
        <Select value={layoutMode} onValueChange={(value: any) => onLayoutModeChange(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select layout" />
          </SelectTrigger>
          <SelectContent>
            {layoutOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
