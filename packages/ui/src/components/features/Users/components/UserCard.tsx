import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@rentalshop/ui';
import { Mail, Phone, Calendar, Building, User as UserIcon } from 'lucide-react';
import type { User } from '@rentalshop/types';

interface UserCardProps {
  user: User;
  onUserAction: (action: string, userId: string) => void;
}

export function UserCard({ user, onUserAction }: UserCardProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'MERCHANT':
        return 'default';
      case 'OUTLET_STAFF':
        return 'secondary';
      case 'CLIENT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'MERCHANT':
        return 'Merchant';
      case 'OUTLET_STAFF':
        return 'Staff';
      case 'CLIENT':
        return 'Client';
      default:
        return role;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{user.name}</h3>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {getRoleDisplayName(user.role)}
              </Badge>
            </div>
          </div>
          
          <Badge variant={user.isActive ? 'default' : 'secondary'}>
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4" />
            <span>{user.email}</span>
          </div>
          
          {user.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{user.phone}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Joined {formatDate(user.createdAt)}</span>
          </div>
        </div>

        {/* Organization Info */}
        {user.merchant && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Building className="w-4 h-4" />
            <span>{user.merchant.companyName}</span>
          </div>
        )}

        {/* Outlet Staff Info */}
        {user.outletStaff && user.outletStaff.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Outlet Assignments:</h4>
            <div className="space-y-1">
              {user.outletStaff.map((staff) => (
                <div key={staff.id} className="text-sm text-gray-600">
                  <span className="font-medium">{staff.outlet.name}</span>
                  <span className="text-gray-500"> - {staff.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUserAction('view', user.id)}
            className="flex-1"
          >
            View
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUserAction('edit', user.id)}
            className="flex-1"
          >
            Edit
          </Button>
          
          {user.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUserAction('deactivate', user.id)}
              className="flex-1"
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUserAction('activate', user.id)}
              className="flex-1"
            >
              Activate
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
