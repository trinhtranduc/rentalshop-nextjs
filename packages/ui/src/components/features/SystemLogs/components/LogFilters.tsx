import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Select } from '../../../ui/select';
import { Button } from '../../../ui/button';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';

interface LogFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  levelFilter: string;
  onLevelFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
}

const levelOptions = [
  { value: 'all', label: 'All Levels' },
  { value: 'DEBUG', label: 'Debug' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARN', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'FATAL', label: 'Fatal' }
];

const sourceOptions = [
  { value: 'all', label: 'All Sources' },
  { value: 'API', label: 'API' },
  { value: 'DATABASE', label: 'Database' },
  { value: 'AUTH', label: 'Authentication' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'CLIENT', label: 'Client' }
];

const dateOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }
];

export default function LogFilters({
  searchTerm,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  sourceFilter,
  onSourceFilterChange,
  dateFilter,
  onDateFilterChange,
  onRefresh,
  onExport,
  loading = false
}: LogFiltersProps) {
  const [localSearch, setLocalSearch] = React.useState<string>(searchTerm || '');
  
  // Sync với searchTerm khi thay đổi từ bên ngoài (ví dụ: clear filters)
  React.useEffect(() => {
    setLocalSearch(searchTerm || '');
  }, [searchTerm]);

  // Handle input change - chỉ cập nhật local state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  // Handle Enter key - chỉ search khi nhấn Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchChange(localSearch);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Log Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                placeholder="Search logs..."
                value={localSearch}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              Level
            </label>
            <Select value={levelFilter} onValueChange={onLevelFilterChange}>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              Source
            </label>
            <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              Date Range
            </label>
            <Select value={dateFilter} onValueChange={onDateFilterChange}>
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Export</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
