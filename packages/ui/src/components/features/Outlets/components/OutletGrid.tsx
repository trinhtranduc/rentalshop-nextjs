import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  StatusBadge
} from '@rentalshop/ui';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Edit, 
  Eye 
} from 'lucide-react';
import type { Outlet } from '@rentalshop/types';

interface OutletGridProps {
  outlets: Outlet[];
  onOutletAction: (action: string, outletId: number) => void;
}

export function OutletGrid({
  outlets,
  onOutletAction
}: OutletGridProps) {
  if (outlets.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Outlets Found</h3>
          <p className="text-sm">No outlets match your current filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {outlets.map((outlet) => (
        <Card key={outlet.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {outlet.name}
              </CardTitle>
              <StatusBadge 
                status={outlet.isActive ? 'active' : 'inactive'}
                variant={outlet.isActive ? 'success' : 'destructive'}
              >
                {outlet.isActive ? 'Active' : 'Inactive'}
              </StatusBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address */}
            {outlet.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {outlet.address}
                </div>
              </div>
            )}

            {/* Phone */}
            {outlet.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {outlet.phone}
                </div>
              </div>
            )}

            {/* Description */}
            {outlet.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {outlet.description}
              </div>
            )}

            {/* Created Date */}
            <div className="text-xs text-gray-500">
              Created: {new Date(outlet.createdAt).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onOutletAction('view', outlet.id)}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onOutletAction('edit', outlet.id)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
