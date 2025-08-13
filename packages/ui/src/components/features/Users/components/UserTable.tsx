import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Eye, Edit, UserCheck, UserX } from 'lucide-react';
import type { User } from '../types';

interface UserTableProps {
  users: User[];
  onUserAction: (action: string, userId: string) => void;
}

export function UserTable({ users, onUserAction }: UserTableProps) {
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

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium mb-2">No users found</h3>
          <p className="text-sm">
            Try adjusting your filters or add some users to get started.
          </p>
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
            <TableHead>Contact</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleDisplayName(user.role)}
                </Badge>
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
                {user.merchant ? (
                  <div className="text-sm text-gray-900">{user.merchant.companyName}</div>
                ) : user.outletStaff && user.outletStaff.length > 0 ? (
                  <div className="space-y-1">
                    {user.outletStaff.map((staff) => (
                      <div key={staff.id} className="text-sm text-gray-900">
                        {staff.outlet.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </TableCell>
              
              <TableCell>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              
              <TableCell>
                <span className="text-sm text-gray-900">
                  {formatDate(user.createdAt)}
                </span>
              </TableCell>
              
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUserAction('view', user.id)}
                    className="h-8 w-8 p-0"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUserAction('edit', user.id)}
                    className="h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUserAction('deactivate', user.id)}
                      className="h-8 w-8 p-0"
                      title="Deactivate"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUserAction('activate', user.id)}
                      className="h-8 w-8 p-0"
                      title="Activate"
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
