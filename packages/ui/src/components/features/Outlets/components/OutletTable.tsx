import React from 'react';
import { 
  Card, 
  CardContent,
  Button,
  StatusBadge
} from '@rentalshop/ui';
import { 
  Building2, 
  Edit, 
  Eye,
  Power,
  PowerOff
} from 'lucide-react';
import type { Outlet } from '@rentalshop/types';

interface OutletTableProps {
  outlets: Outlet[];
  onOutletAction: (action: string, outletId: number) => void;
  onSort?: (column: string) => void;
}

export function OutletTable({
  outlets,
  onOutletAction,
  onSort
}: OutletTableProps) {
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
    <div className="space-y-6">
      {/* Header with sorting options */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Outlets ({outlets.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Sort by:</span>
          <div className="flex items-center gap-1">
            {[
              { key: 'name', label: 'Name' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onSort?.(key)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card-style rows */}
      <div className="grid gap-4">
        {outlets.map((outlet) => (
          <Card 
            key={outlet.id} 
            className="hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-gray-700"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left side - Main info */}
                <div className="flex items-center gap-3 flex-1">
                  {/* Outlet Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {outlet.name}
                        {!outlet.isActive && (
                          <span className="ml-2 text-sm text-red-600 font-normal">(Disabled)</span>
                        )}
                      </h3>
                      <StatusBadge 
                        status={outlet.isActive ? 'active' : 'inactive'}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {/* Address */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Address</p>
                        <p className="text-gray-900 dark:text-white">{outlet.address}</p>
                      </div>
                      
                      {/* Phone */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                        <p className="text-gray-900 dark:text-white">{outlet.phone}</p>
                      </div>
                      
                      {/* Created Date */}
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">Created</p>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(outlet.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOutletAction('view', outlet.id)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOutletAction('edit', outlet.id)}
                    className="h-8 px-3"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={outlet.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => onOutletAction(outlet.isActive ? 'disable' : 'enable', outlet.id)}
                    className="h-8 px-3"
                  >
                    {outlet.isActive ? (
                      <>
                        <PowerOff className="h-3 w-3 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="h-3 w-3 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
