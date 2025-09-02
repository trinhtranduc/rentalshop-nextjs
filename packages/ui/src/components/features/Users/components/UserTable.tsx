import React from 'react';
import { UserRow } from './UserRow';
import type { User } from '@rentalshop/types';

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
    <div className="space-y-4">
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          onUserAction={onUserAction}
          showActions={showActions}
          actions={actions}
          className={className}
        />
      ))}
    </div>
  );
}
