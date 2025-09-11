'use client';

import React from 'react';
import { 
  Card, 
  CardContent,
  Button
} from '@rentalshop/ui';
import { Shield } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface SecuritySectionProps {
  onChangePassword: () => void;
}

// ============================================================================
// SECURITY SECTION COMPONENT
// ============================================================================

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  onChangePassword
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security</h2>
        <p className="text-gray-600">Manage your password and account security settings</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Password</h3>
                  <p className="text-sm text-gray-600">Change your password to keep your account secure</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={onChangePassword}
              >
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
