import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface MaintenanceModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export default function MaintenanceModeToggle({ 
  isActive, 
  onToggle, 
  loading = false 
}: MaintenanceModeToggleProps) {
  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Maintenance Mode Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-sm font-medium">
              {isActive ? 'Maintenance Mode Active' : 'System Normal'}
            </span>
          </div>
          <Button
            variant={isActive ? 'default' : 'outline'}
            onClick={onToggle}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isActive ? 'Disable' : 'Enable'} Maintenance Mode
          </Button>
        </div>
        
        {isActive && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Warning:</strong> Maintenance mode is currently active. 
              Users may experience limited access to the system.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
