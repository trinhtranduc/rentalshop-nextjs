import React from 'react';
import type { User } from '@rentalshop/types';
import { Button } from '../../../ui/button';

interface UserTableProps {
  users: User[];
  onUserAction: (action: string, userId: number) => void;
  showActions?: boolean;
  actions?: ('view' | 'edit' | 'activate' | 'deactivate')[];
  className?: string;
}

export function UserTable({ 
  users, 
  onUserAction, 
  showActions = true, 
  actions = ['view', 'edit'],
  className = 'py-4'
}: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            {showActions && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.email
                      }
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.phone && (
                      <div className="text-sm text-gray-500">{user.phone}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'MERCHANT' ? 'bg-blue-100 text-blue-800' :
                  user.role === 'OUTLET_ADMIN' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {user.merchant?.name || 'No organization'}
                </div>
                {user.outlet && (
                  <div className="text-sm text-gray-500">{user.outlet.name}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              {showActions && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {actions.includes('view') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUserAction('view', user.id)}
                      >
                        View
                      </Button>
                    )}
                    {actions.includes('edit') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUserAction('edit', user.id)}
                      >
                        Edit
                      </Button>
                    )}
                    {actions.includes('activate') && !user.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUserAction('activate', user.id)}
                      >
                        Activate
                      </Button>
                    )}
                    {actions.includes('deactivate') && user.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUserAction('deactivate', user.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
