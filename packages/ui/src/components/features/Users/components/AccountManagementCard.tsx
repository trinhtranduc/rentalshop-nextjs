'use client'

import React from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { UserCheck, UserX, Trash2 } from 'lucide-react';
import type { User } from '../types';

interface AccountManagementCardProps {
  user: User;
  isUpdating: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

export const AccountManagementCard: React.FC<AccountManagementCardProps> = ({
  user,
  isUpdating,
  onActivate,
  onDeactivate,
  onDelete
}) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Account Management</h2>
      </div>
      
      <div className="px-6 py-4 space-y-4">
        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Account Status</h3>
            <p className="text-sm text-gray-600">
              {user.isActive 
                ? 'User can currently log in and access the system' 
                : 'User is currently disabled and cannot access the system'
              }
            </p>
          </div>
          
          <div className="flex gap-2">
            {user.isActive ? (
              <Button 
                onClick={onDeactivate} 
                variant="outline" 
                disabled={isUpdating}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <UserX className="w-4 h-4 mr-2" />
                Deactivate
              </Button>
            ) : (
              <Button 
                onClick={onActivate} 
                variant="outline" 
                disabled={isUpdating}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Activate
              </Button>
            )}
          </div>
        </div>

        {/* Delete Account */}
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
            <p className="text-sm text-red-700">
              This action cannot be undone. This will permanently delete the user account and remove all associated data.
            </p>
          </div>
          
          <Button 
            onClick={onDelete}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
};
