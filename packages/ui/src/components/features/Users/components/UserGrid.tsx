import React from 'react';
import { UserCard } from './UserCard';
import { Card, CardContent } from '@rentalshop/ui';
import type { User } from '@rentalshop/types';

interface UserGridProps {
  users: User[];
  onUserAction: (action: string, userId: number) => void;
}

export function UserGrid({ users, onUserAction }: UserGridProps) {
  if (users.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-sm">
              Try adjusting your filters or add some users to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onUserAction={onUserAction}
        />
      ))}
    </div>
  );
}
