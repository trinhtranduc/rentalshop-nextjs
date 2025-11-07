import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@rentalshop/ui/base';
import { Mail, Phone, Calendar, Building, User as UserIcon } from 'lucide-react';
import type { User } from '@rentalshop/types';

interface UserCardProps {
  user: User;
  onUserAction: (action: string, userId: number) => void;
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
              <UserIcon className="w-6 h-6 text-blue-700" />
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
            <span>Joined {formatDate(user.createdAt.toString())}</span>
          </div>
        </div>

        {/* Organization Info */}
        {user.merchant && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Building className="w-4 h-4" />
            <span>{user.merchant.name}</span>
          </div>
        )}

        {/* Outlet Info */}
        {user.outlet && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Building className="w-4 h-4" />
            <span>{user.outlet.name}</span>
            {user.outlet.merchant && (
              <span className="text-gray-500"> - {user.outlet.merchant.name}</span>
            )}
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
        </div>
      </div>
    </Card>
  );
}
