import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@rentalshop/ui/base';
import { 
  Building2, 
  Grid, 
  List, 
  Plus 
} from 'lucide-react';
import { useOutletsTranslations } from '@rentalshop/hooks';

interface OutletHeaderProps {
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onAddOutlet: () => void;
  totalOutlets: number;
  merchantId?: number;
}

export function OutletHeader({
  viewMode,
  onViewModeChange,
  onAddOutlet,
  totalOutlets,
  merchantId
}: OutletHeaderProps) {
  const t = useOutletsTranslations();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t('title')} ({totalOutlets})
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Add Outlet Button */}
          <Button onClick={onAddOutlet}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addOutlet')}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
