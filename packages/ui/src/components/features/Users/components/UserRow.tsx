import React from 'react';
import { 
  Card,
  CardContent,
  Button
} from '@rentalshop/ui';
import { 
  Eye, 
  Edit, 
  Building2, 
  Store,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { User } from '@rentalshop/types';

interface UserRowProps {
  user: User;
  onUserAction: (action: string, userId: number) => void;
  showActions?: boolean;
  actions?: string[];
  className?: string;
}

export function UserRow({ 
  user, 
  onUserAction, 
  showActions = true, 
  actions = ['view', 'edit'],
  className = "py-4"
}: UserRowProps) {
  const handleUserAction = (action: string, userId: number) => {
    console.log('🔍 UserRow: handleUserAction called:', { action, userId, user });
    onUserAction(action, userId);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'MERCHANT':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'OUTLET_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'OUTLET_STAFF':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'MERCHANT':
        return 'Merchant';
      case 'OUTLET_ADMIN':
        return 'Outlet Admin';
      case 'OUTLET_STAFF':
        return 'Outlet Staff';
      default:
        return role;
    }
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    if (isActive) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
    } else {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }
  };

  const getStatusDisplayName = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderActionButton = (action: string) => {
    switch (action) {
      case 'view':
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUserAction('view', user.id)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        );
      case 'edit':
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUserAction('edit', user.id)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        );
      case 'activate':
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUserAction('activate', user.id)}
          >
            Activate
          </Button>
        );
      case 'deactivate':
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleUserAction('deactivate', user.id)}
          >
            Deactivate
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className={className}>
        <div className="flex items-center justify-between">
          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-text-primary">
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Unknown User'}
                  </h3>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(user.role)}`}>
                    {getRoleDisplayName(user.role)}
                  </div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(user.isActive)}`}>
                    {getStatusDisplayName(user.isActive)}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.outlet && (
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      <span>{user.outlet.name}</span>
                      {user.outlet.merchant && (
                        <span className="text-text-tertiary">• {user.outlet.merchant.name}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString())}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-text-tertiary mt-1">
                  <span>Last login: {user.lastLoginAt ? formatDate(typeof user.lastLoginAt === 'string' ? user.lastLoginAt : user.lastLoginAt.toISOString()) : 'Never'}</span>
                  <span>Email verified: {user.emailVerified ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              {actions.map((action) => {
                // Show activate/deactivate based on user status
                if (action === 'activate' && user.isActive) return null;
                if (action === 'deactivate' && !user.isActive) return null;
                
                return (
                  <div key={action}>
                    {renderActionButton(action)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
