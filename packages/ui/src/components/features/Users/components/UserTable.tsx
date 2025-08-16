import React, { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Eye, Edit, UserCheck, UserX, MoreHorizontal } from 'lucide-react';
import type { User } from '../types';

interface UserTableProps {
  users: User[];
  onUserAction: (action: string, userId: string) => void;
}

export function UserTable({ users, onUserAction }: UserTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Use publicId for dropdown management since internal IDs are not exposed
  const getDropdownId = (user: User) => user.publicId?.toString() || user.id;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && dropdownRefs.current[openDropdownId]) {
        const dropdownElement = dropdownRefs.current[openDropdownId];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleDropdownToggle = (userId: string) => {
    console.log('🔍 Dropdown toggle:', { userId, currentOpen: openDropdownId, willOpen: openDropdownId !== userId });
    setOpenDropdownId(openDropdownId === userId ? null : userId);
  };

  const handleUserAction = (action: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    console.log('🔍 UserTable: handleUserAction called:', { action, userId, user });
    
    if (action === 'delete') {
      if (user) {
        setDeleteConfirmUser(user);
        setOpenDropdownId(null);
        return;
      }
    }
    
    // Call the parent onUserAction handler
    onUserAction(action, userId);
    
    // Close the dropdown after action
    setOpenDropdownId(null);
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
            <TableHead>Outlet</TableHead>
            <TableHead>Contact</TableHead>
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
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(user.role)}`}>
                  {getRoleDisplayName(user.role)}
                </div>
              </TableCell>
              
              <TableCell>
                {user.outletStaff && user.outletStaff.length > 0 ? (
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
                  {formatDate(user.createdAt)}
                </span>
              </TableCell>
              
              <TableCell>
                <div className="relative" ref={(el) => { dropdownRefs.current[user.id] = el; }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDropdownToggle(user.id)}
                    className="h-8 w-8 p-0"
                    title="Actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {/* Dropdown Menu */}
                  {openDropdownId === user.id && (
                    <div 
                      key={`dropdown-${user.id}`}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 min-w-[12rem]" 
                      style={{ zIndex: 1000 }}
                    >
                      <div className="py-1">
                        <div 
                          key={`view-${user.id}`}
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                          onClick={() => handleUserAction('view', user.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </div>
                        <div className="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-600"></div>
                        {user.isActive ? (
                          <div 
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                            onClick={() => handleUserAction('deactivate', user.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate User
                          </div>
                        ) : (
                          <div 
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => handleUserAction('activate', user.id)}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate User
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirmUser && (
        <ConfirmationDialog
          open={!!deleteConfirmUser}
          onOpenChange={(open) => !open && setDeleteConfirmUser(null)}
          type="danger"
          title="Delete User"
          description={`Are you sure you want to delete user "${deleteConfirmUser?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            if (deleteConfirmUser) {
              onUserAction('delete', deleteConfirmUser.id);
              setDeleteConfirmUser(null);
            }
          }}
        />
      )}
    </div>
  );
}
