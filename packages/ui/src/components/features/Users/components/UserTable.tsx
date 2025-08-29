import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Button,
  Badge
} from '@rentalshop/ui';
import { Eye } from 'lucide-react';
import type { User } from '@rentalshop/types';

interface UserTableProps {
  users: User[];
  onUserAction: (action: string, userId: number) => void;
}

export function UserTable({ users, onUserAction }: UserTableProps) {
  const handleUserAction = (action: string, userId: number) => {
    const user = users.find(u => u.id === userId);
    console.log('🔍 UserTable: handleUserAction called:', { action, userId, user });
    
    // Call the parent onUserAction handler for all actions
    onUserAction(action, userId);
  };

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
      case 'OUTLET_ADMIN':
        return 'Outlet Admin';
      case 'OUTLET_STAFF':
        return 'Outlet Staff';
      default:
        return role;
    }
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

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return '🟢'; // Green circle
    } else {
      return '🟡'; // Yellow circle
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (users.length === 0) {
    return (
      <div className="shadow-sm border-gray-200 dark:border-gray-700 rounded-lg border overflow-hidden">
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-sm">
              Try adjusting your filters or add some users to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Outlet</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {(user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.name || 'Unknown User'
                      }
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(user.role)}`}>
                  {getRoleDisplayName(user.role)}
                </div>
              </TableCell>
              
              <TableCell>
                {user.outlet ? (
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{user.outlet.name}</div>
                    {user.outlet.merchant && (
                      <div className="text-xs text-gray-500">{user.outlet.merchant.name}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  {user.phone && (
                    <div className="text-sm text-gray-500">{user.phone}</div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(user.isActive)}`}>
                  {getStatusDisplayName(user.isActive)}
                </div>
              </TableCell>
              
              <TableCell>
                <span className="text-sm text-gray-900">
                  {formatDate(typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString())}
                </span>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  {/* Direct View Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUserAction('view', user.id)}
                    className="h-8 px-3"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
