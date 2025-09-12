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
